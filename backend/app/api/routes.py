import asyncio
import json

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from pydantic import BaseModel

from .schemas import SimulationRequest, SimulationResponse
from ..simulation.engine import run_simulation, run_simulation_chunked
from ..llm.law_parser import parse_law

router = APIRouter()


@router.post("/simulate", response_model=SimulationResponse)
async def simulate(req: SimulationRequest):
    effects = [e.model_dump() for e in req.effects]
    loop = asyncio.get_event_loop()
    output = await loop.run_in_executor(
        None,
        lambda: run_simulation(
            effects=effects,
            inflation_shock=req.inflation_shock,
            vat_food_rate=req.vat_food_rate,
            duration_days=req.duration_days,
        ),
    )
    return SimulationResponse(
        total_days=len(output["results"]),
        effect_log=output["effect_log"],
        results=output["results"],
    )


@router.websocket("/ws/simulate")
async def ws_simulate(websocket: WebSocket):
    await websocket.accept()
    try:
        raw = await websocket.receive_text()
        req = SimulationRequest.model_validate_json(raw)
        effects = [e.model_dump() for e in req.effects]

        loop = asyncio.get_event_loop()

        def _gen_chunks():
            return list(
                run_simulation_chunked(
                    effects=effects,
                    inflation_shock=req.inflation_shock,
                    vat_food_rate=req.vat_food_rate,
                    duration_days=req.duration_days,
                    chunk_size=10,
                )
            )

        chunks = await loop.run_in_executor(None, _gen_chunks)

        for chunk in chunks:
            await websocket.send_text(json.dumps({"type": "data", "days": chunk}))
            await asyncio.sleep(0)

        await websocket.send_text(json.dumps({"type": "done"}))

    except WebSocketDisconnect:
        pass
    except Exception as e:
        await websocket.send_text(json.dumps({"type": "error", "message": str(e)}))
        await websocket.close()


class LawInput(BaseModel):
    law_text: str


@router.post("/parse-law")
async def parse_law_endpoint(body: LawInput):
    """Yasa metnini LLM ile effects JSON'a çevirir."""
    loop = asyncio.get_event_loop()
    result = await loop.run_in_executor(None, lambda: parse_law(body.law_text))
    return result


@router.post("/parse-and-simulate")
async def parse_and_simulate(body: LawInput):
    """Yasa metnini al → LLM ile parse et → simüle et. Tek adımda."""
    import traceback as _tb

    try:
        loop = asyncio.get_running_loop()

        # 1. LLM parse
        try:
            parsed = await loop.run_in_executor(None, lambda: parse_law(body.law_text))
        except Exception as e:
            _tb.print_exc()
            return {"error": f"LLM hatası: {type(e).__name__}: {e}", "results": []}

        if not isinstance(parsed, dict):
            return {"error": f"LLM beklenmedik çıktı: {type(parsed)}", "results": []}

        effects  = parsed.get("effects", [])
        macro    = parsed.get("macro", {}) or {}
        dynamics = parsed.get("dynamics") or None

        print("\n── LLM PARSE ──")
        print(json.dumps(parsed, ensure_ascii=False, indent=2))
        print("───────────────\n")

        # 2. Simülasyon
        try:
            output = await loop.run_in_executor(
                None,
                lambda: run_simulation(
                    effects=effects,
                    inflation_shock=float(macro.get("inflation_shock", 0.0)),
                    vat_food_rate=macro.get("vat_food_rate") or None,
                    duration_days=365,
                    dynamics=dynamics,
                ),
            )
        except Exception as e:
            _tb.print_exc()
            return {"error": f"Simülasyon hatası: {type(e).__name__}: {e}", "results": []}

        # 3. Düz dict döndür — Pydantic serileştirme sorununu atla
        return {
            "total_days":  len(output["results"]),
            "effect_log":  output.get("effect_log", []),
            "results":     output["results"],
        }

    except Exception as e:
        _tb.print_exc()
        return {"error": f"Beklenmedik hata: {type(e).__name__}: {e}", "results": []}


@router.get("/health")
async def health():
    return {"status": "ok"}

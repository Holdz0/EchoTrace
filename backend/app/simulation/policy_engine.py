import numpy as np
from .agents import AgentPopulation


def apply_effects(agents: AgentPopulation, effects: list[dict]) -> list[str]:
    """
    LLM'den gelen effect listesini ajanlara uygular.
    Her effect: {target, filter, operation, value}
    Geri dönüş: uygulanan etkilerin açıklaması (log için)
    """
    log = []
    for effect in effects:
        mask = _build_mask(agents, effect.get("filter", {}))
        n_affected = int(mask.sum())
        if n_affected == 0:
            log.append(f"SKIP: filtre hiç ajan seçmedi — {effect}")
            continue
        _apply_operation(agents, effect["target"], effect["operation"], effect["value"], mask)
        log.append(
            f"OK: {n_affected} ajan etkilendi — "
            f"{effect['target']} {effect['operation']} {effect['value']} "
            f"(filtre: {effect.get('filter', 'tümü')})"
        )
    return log


def _build_mask(agents: AgentPopulation, filters: dict) -> np.ndarray:
    """
    Filtre dict'ini NumPy boolean mask'e çevirir.
    Birden fazla filtre AND ile birleşir.
    """
    mask = np.ones(len(agents.age), dtype=bool)

    for field, condition in filters.items():
        arr = _get_field(agents, field)

        if isinstance(condition, dict):
            for op, val in condition.items():
                if op == "gt":   mask &= arr > val
                elif op == "gte": mask &= arr >= val
                elif op == "lt":  mask &= arr < val
                elif op == "lte": mask &= arr <= val
                elif op == "eq":  mask &= arr == val
                elif op == "between":
                    mask &= (arr >= val[0]) & (arr <= val[1])
        elif isinstance(condition, list):
            # profession: [0, 1] gibi liste → OR
            sub = np.zeros(len(arr), dtype=bool)
            for v in condition:
                sub |= arr == v
            mask &= sub
        else:
            mask &= arr == condition

    return mask


def _apply_operation(
    agents: AgentPopulation,
    target: str,
    operation: str,
    value,
    mask: np.ndarray,
) -> None:
    arr = _get_field(agents, target)

    if operation == "set":
        arr[mask] = value
    elif operation == "multiply":
        arr[mask] *= value
    elif operation == "add":
        arr[mask] += value
    elif operation == "subtract":
        arr[mask] -= value
    elif operation == "min":
        arr[mask] = np.maximum(arr[mask], value)
    elif operation == "max":
        arr[mask] = np.minimum(arr[mask], value)
    else:
        raise ValueError(f"Bilinmeyen operasyon: {operation}")

    # Çalışma yasağı: can_work ve income da sıfırlanır
    if target == "employed" and operation == "set" and not value:
        agents.can_work[mask] = False
        agents.income[mask] = 0.0

    # income değişince income_percentile'ı yeniden hesapla
    if target in ("income", "employed"):
        rank = np.argsort(np.argsort(agents.income))
        agents.income_percentile[:] = rank / (len(agents.income) - 1)


def _get_field(agents: AgentPopulation, field: str) -> np.ndarray:
    field_map = {
        "age":                 agents.age,
        "income":              agents.income,
        "income_percentile":   agents.income_percentile,
        "profession":          agents.profession,
        "savings":             agents.savings,
        "consumption":         agents.consumption,
        "employed":            agents.employed,
        "price_sensitivity":   agents.price_sensitivity,
        "city":                agents.city,
        "gender":              agents.gender,
        "education_level":     agents.education_level,
        "children_count":      agents.children_count,
        "home_ownership":      agents.home_ownership,
        "informal_employment": agents.informal_employment,
        "economic_sector":     agents.economic_sector,
        "debt":                agents.debt,
    }
    if field not in field_map:
        raise ValueError(f"Bilinmeyen alan: {field}. Geçerli alanlar: {list(field_map.keys())}")
    return field_map[field]

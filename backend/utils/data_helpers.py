from typing import Any, Callable, Tuple, Union, List

def build_sort_key(*criteria: Tuple[str, Union[str, List[Any]]]) -> Callable[[Any], Tuple[Any, ...]]:
    """
    Builds a multi-field sorting key function.
    
    Each criterion can specify a sorting rule:
      - "asc" or "desc" for standard ascending/descending sort
      - A list specifying a custom order (e.g., ["low", "medium", "high"])

    Parameters:
        criteria: A list of tuples in the form (field_name, rule),
                  where rule is either a string ("asc"/"desc") or a custom list.

    Returns:
        A key function that can be used with sorted() or list.sort().
    """
    def sort_fn(obj: Any) -> Tuple[Any, ...]:
        keys = []
        for attr, rule in criteria:
            value = getattr(obj, attr)

            # If a custom order is provided as a list
            if isinstance(rule, list):
                try:
                    order_index = rule.index(value)
                except ValueError:
                    order_index = len(rule)  # Values not in the list are sorted last
                keys.append(order_index)
            elif rule == "asc":
                keys.append(value)
            elif rule == "desc":
                keys.append(-value if isinstance(value, (int, float)) else ''.join(reversed(str(value))))
            else:
                raise ValueError(f"Unsupported sort rule: {rule}")
        return tuple(keys)

    return sort_fn

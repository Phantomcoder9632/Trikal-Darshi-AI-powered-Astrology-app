import re
from datetime import date
from typing import Dict, Any

# Exact Chaldean letter values mapping as specified:
# A=1, B=2, C=3, D=4, E=5, F=8, G=3, H=5, I=1, J=1, K=2, L=3, M=4,
# N=5, O=7, P=8, Q=1, R=2, S=3, T=4, U=6, V=6, W=6, X=5, Y=1, Z=7
CHALDEAN_TABLE = {
    'A': 1, 'B': 2, 'C': 3, 'D': 4, 'E': 5, 'F': 8, 'G': 3, 'H': 5,
    'I': 1, 'J': 1, 'K': 2, 'L': 3, 'M': 4, 'N': 5, 'O': 7, 'P': 8,
    'Q': 1, 'R': 2, 'S': 3, 'T': 4, 'U': 6, 'V': 6, 'W': 6, 'X': 5,
    'Y': 1, 'Z': 7
}

# Ruling planets for single-digit numerology numbers (1 to 9)
RULING_PLANETS = {
    1: "Sun",
    2: "Moon",
    3: "Jupiter",
    4: "Rahu",
    5: "Mercury",
    6: "Venus",
    7: "Ketu",
    8: "Saturn",
    9: "Mars"
}

def reduce_to_single_digit(n: int) -> int:
    """
    Continually sum the digits of a number until it's reduced to a single digit (1-9).
    """
    while n > 9:
        n = sum(int(d) for d in str(n))
    return n

def calculate_moolank(dob: date) -> int:
    """
    Moolank (Psychic / Driver Number): Single digit of the day of birth.
    """
    return reduce_to_single_digit(dob.day)

def calculate_bhagyank(dob: date) -> int:
    """
    Bhagyank (Destiny / Conductor Number): Sum of all digits in the DOB reduced to a single digit.
    """
    dob_digits_sum = sum(int(char) for char in dob.strftime("%d%m%Y") if char.isdigit())
    return reduce_to_single_digit(dob_digits_sum)

def calculate_namank(full_name: str) -> int:
    """
    Namank (Name Number): Chaldean value sum of all letters in full name, reduced to a single digit.
    """
    cleaned = re.sub(r'[^A-Z]', '', full_name.upper())
    total_val = sum(CHALDEAN_TABLE.get(char, 0) for char in cleaned)
    return reduce_to_single_digit(total_val) if total_val > 0 else 0

def get_numerology(dob: date, full_name: str) -> Dict[str, Any]:
    """
    Main function to compute all numerology values, planets, and return a structure
    matching the AstrologyAPI `/numero_table` signature.
    """
    moolank = calculate_moolank(dob)
    bhagyank = calculate_bhagyank(dob)
    namank = calculate_namank(full_name)

    return {
        "moolank": moolank,
        "moolank_lord": RULING_PLANETS.get(moolank, "Unknown"),
        "bhagyank": bhagyank,
        "bhagyank_lord": RULING_PLANETS.get(bhagyank, "Unknown"),
        "namank": namank,
        "namank_lord": RULING_PLANETS.get(namank, "Unknown") if namank > 0 else "N/A",
        # Keep exact response formatting keys compatible with AstrologyAPI
        "destiny_number": bhagyank,
        "radical_number": moolank,
        "name_number": namank,
        "radical_ruler": RULING_PLANETS.get(moolank, "Unknown"),
        "destiny_ruler": RULING_PLANETS.get(bhagyank, "Unknown"),
        "name_ruler": RULING_PLANETS.get(namank, "Unknown") if namank > 0 else "N/A"
    }

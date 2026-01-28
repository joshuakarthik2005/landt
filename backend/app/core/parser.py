"""
Formula Parser - Tokenizes and extracts dependencies from Excel formulas.

This module handles the parsing of Excel formulas into Abstract Syntax Trees (AST)
and extracts cell references, function calls, and other dependencies.
"""

import re
from typing import List, Set, Dict, Optional, Tuple
from dataclasses import dataclass
from enum import Enum
from ..utils import get_logger

logger = get_logger(__name__)


class TokenType(Enum):
    """Types of tokens in Excel formulas."""
    CELL_REF = "cell_ref"  # A1, $A$1, etc.
    RANGE_REF = "range_ref"  # A1:B10
    SHEET_REF = "sheet_ref"  # Sheet1!A1
    NAMED_RANGE = "named_range"  # MyRange
    FUNCTION = "function"  # SUM, VLOOKUP, etc.
    OPERATOR = "operator"  # +, -, *, /
    NUMBER = "number"
    STRING = "string"
    BOOLEAN = "boolean"
    ERROR = "error"  # #REF!, #NAME!, etc.


@dataclass
class Token:
    """Represents a single token in a formula."""
    type: TokenType
    value: str
    position: int
    
    def __repr__(self) -> str:
        return f"Token({self.type.value}, '{self.value}')"


@dataclass
class CellReference:
    """Represents a cell reference with sheet context."""
    sheet: Optional[str]
    col: str
    row: int
    is_absolute_col: bool = False
    is_absolute_row: bool = False
    
    def to_address(self) -> str:
        """Convert to A1 notation."""
        col = f"${self.col}" if self.is_absolute_col else self.col
        row = f"${self.row}" if self.is_absolute_row else str(self.row)
        addr = f"{col}{row}"
        return f"{self.sheet}!{addr}" if self.sheet else addr
    
    def __hash__(self):
        return hash(self.to_address())
    
    def __eq__(self, other):
        return self.to_address() == other.to_address()


class FormulaParser:
    """
    Parses Excel formulas and extracts dependencies.
    
    Handles:
    - Simple cell references (A1, $A$1)
    - Range references (A1:B10)
    - Cross-sheet references (Sheet1!A1)
    - Named ranges
    - Function calls
    - Dynamic functions (INDIRECT, OFFSET, INDEX)
    """
    
    # Regex patterns for different reference types
    CELL_PATTERN = re.compile(
        r'(\$?[A-Z]+\$?\d+)',
        re.IGNORECASE
    )
    
    RANGE_PATTERN = re.compile(
        r'(\$?[A-Z]+\$?\d+:\$?[A-Z]+\$?\d+)',
        re.IGNORECASE
    )
    
    SHEET_REF_PATTERN = re.compile(
        r"(['\"]?[\w\s]+['\"]?!)(\$?[A-Z]+\$?\d+(?::\$?[A-Z]+\$?\d+)?)",
        re.IGNORECASE
    )
    
    FUNCTION_PATTERN = re.compile(
        r'([A-Z_][A-Z0-9_.]*)\s*\(',
        re.IGNORECASE
    )
    
    # Dynamic functions that require special handling
    DYNAMIC_FUNCTIONS = {'INDIRECT', 'OFFSET', 'INDEX', 'CHOOSE', 'VLOOKUP', 'HLOOKUP'}
    
    def __init__(self):
        self.logger = logger.bind(component="FormulaParser")
    
    def parse(self, formula: str, current_sheet: Optional[str] = None) -> Dict[str, any]:
        """
        Parse a formula and extract all dependencies.
        
        Args:
            formula: Excel formula string (with or without leading =)
            current_sheet: Name of the sheet containing this formula
            
        Returns:
            Dictionary containing:
                - dependencies: Set of CellReference objects
                - functions: List of function names used
                - is_dynamic: Whether formula contains dynamic functions
                - tokens: List of Token objects
        """
        if not formula:
            return {
                "dependencies": set(),
                "functions": [],
                "is_dynamic": False,
                "tokens": []
            }
        
        # Remove leading = if present
        formula = formula.lstrip('=').strip()
        
        # Extract all components
        dependencies = self._extract_dependencies(formula, current_sheet)
        functions = self._extract_functions(formula)
        tokens = self._tokenize(formula)
        
        # Check if formula uses dynamic functions
        is_dynamic = any(func.upper() in self.DYNAMIC_FUNCTIONS for func in functions)
        
        self.logger.debug(
            "Parsed formula",
            formula=formula[:50],
            dep_count=len(dependencies),
            func_count=len(functions),
            is_dynamic=is_dynamic
        )
        
        return {
            "dependencies": dependencies,
            "functions": functions,
            "is_dynamic": is_dynamic,
            "tokens": tokens,
            "formula": formula
        }
    
    def _extract_dependencies(self, formula: str, current_sheet: Optional[str]) -> Set[CellReference]:
        """Extract all cell and range references from formula."""
        dependencies = set()
        
        # First, extract cross-sheet references
        for match in self.SHEET_REF_PATTERN.finditer(formula):
            sheet_part = match.group(1).strip("'\"!")
            ref_part = match.group(2)
            
            # Handle range references
            if ':' in ref_part:
                start, end = ref_part.split(':')
                dependencies.add(self._parse_cell_ref(start, sheet_part))
                dependencies.add(self._parse_cell_ref(end, sheet_part))
            else:
                dependencies.add(self._parse_cell_ref(ref_part, sheet_part))
        
        # Remove cross-sheet references from formula for next step
        formula_no_sheets = self.SHEET_REF_PATTERN.sub('', formula)
        
        # Extract range references
        for match in self.RANGE_PATTERN.finditer(formula_no_sheets):
            range_ref = match.group(1)
            start, end = range_ref.split(':')
            dependencies.add(self._parse_cell_ref(start, current_sheet))
            dependencies.add(self._parse_cell_ref(end, current_sheet))
        
        # Remove ranges for final cell extraction
        formula_no_ranges = self.RANGE_PATTERN.sub('', formula_no_sheets)
        
        # Extract individual cell references
        for match in self.CELL_PATTERN.finditer(formula_no_ranges):
            cell_ref = match.group(1)
            # Filter out things that look like cell refs but aren't (e.g., in strings)
            if self._is_valid_cell_ref(cell_ref):
                dependencies.add(self._parse_cell_ref(cell_ref, current_sheet))
        
        return dependencies
    
    def _parse_cell_ref(self, ref: str, sheet: Optional[str]) -> CellReference:
        """Parse a cell reference string into CellReference object."""
        # Handle absolute references
        is_absolute_col = ref[0] == '$'
        ref_no_col_abs = ref[1:] if is_absolute_col else ref
        
        # Split into column and row
        col_match = re.match(r'([A-Z]+)', ref_no_col_abs, re.IGNORECASE)
        col = col_match.group(1).upper() if col_match else 'A'
        
        row_part = ref_no_col_abs[len(col):]
        is_absolute_row = row_part.startswith('$')
        row = int(row_part.lstrip('$')) if row_part.lstrip('$') else 1
        
        return CellReference(
            sheet=sheet,
            col=col,
            row=row,
            is_absolute_col=is_absolute_col,
            is_absolute_row=is_absolute_row
        )
    
    def _extract_functions(self, formula: str) -> List[str]:
        """Extract all function names from formula."""
        functions = []
        for match in self.FUNCTION_PATTERN.finditer(formula):
            func_name = match.group(1).upper()
            functions.append(func_name)
        return functions
    
    def _tokenize(self, formula: str) -> List[Token]:
        """Tokenize formula into individual tokens."""
        tokens = []
        position = 0
        
        # This is a simplified tokenizer
        # A production version would use a proper lexer
        
        # For now, just identify major token types
        for match in self.FUNCTION_PATTERN.finditer(formula):
            tokens.append(Token(
                type=TokenType.FUNCTION,
                value=match.group(1),
                position=match.start()
            ))
        
        for match in self.SHEET_REF_PATTERN.finditer(formula):
            tokens.append(Token(
                type=TokenType.SHEET_REF,
                value=match.group(0),
                position=match.start()
            ))
        
        for match in self.RANGE_PATTERN.finditer(formula):
            tokens.append(Token(
                type=TokenType.RANGE_REF,
                value=match.group(1),
                position=match.start()
            ))
        
        for match in self.CELL_PATTERN.finditer(formula):
            if self._is_valid_cell_ref(match.group(1)):
                tokens.append(Token(
                    type=TokenType.CELL_REF,
                    value=match.group(1),
                    position=match.start()
                ))
        
        # Sort by position
        tokens.sort(key=lambda t: t.position)
        return tokens
    
    def _is_valid_cell_ref(self, ref: str) -> bool:
        """Check if a string is a valid cell reference."""
        # Remove $ signs
        ref_clean = ref.replace('$', '')
        
        # Must have letters followed by numbers
        match = re.match(r'^([A-Z]+)(\d+)$', ref_clean, re.IGNORECASE)
        if not match:
            return False
        
        col, row = match.groups()
        
        # Column must be valid (A-XFD for Excel)
        if len(col) > 3:
            return False
        
        # Row must be valid (1-1048576 for Excel)
        try:
            row_num = int(row)
            return 1 <= row_num <= 1048576
        except ValueError:
            return False
    
    def extract_dynamic_dependencies(
        self,
        formula: str,
        cell_values: Dict[str, any],
        current_sheet: Optional[str] = None
    ) -> Set[CellReference]:
        """
        Extract dependencies from dynamic functions like INDIRECT.
        
        This requires evaluating the formula with current cell values
        to determine the actual references.
        
        Args:
            formula: Formula string
            cell_values: Dictionary mapping cell addresses to their values
            current_sheet: Current sheet name
            
        Returns:
            Set of additional CellReference objects found through evaluation
        """
        dynamic_deps = set()
        
        # Parse formula to find dynamic functions
        parsed = self.parse(formula, current_sheet)
        
        if not parsed['is_dynamic']:
            return dynamic_deps
        
        # Handle INDIRECT function
        indirect_pattern = re.compile(r'INDIRECT\s*\(\s*([^)]+)\s*\)', re.IGNORECASE)
        for match in indirect_pattern.finditer(formula):
            arg = match.group(1).strip('"\'')
            
            # Try to resolve the argument
            if arg in cell_values:
                # The argument is a cell reference
                target_value = cell_values[arg]
                if isinstance(target_value, str) and self._is_valid_cell_ref(target_value):
                    dynamic_deps.add(self._parse_cell_ref(target_value, current_sheet))
            elif self._is_valid_cell_ref(arg):
                # The argument is a direct cell reference string
                dynamic_deps.add(self._parse_cell_ref(arg, current_sheet))
        
        # Handle OFFSET function
        offset_pattern = re.compile(r'OFFSET\s*\(\s*([^,]+)', re.IGNORECASE)
        for match in offset_pattern.finditer(formula):
            base_ref = match.group(1).strip()
            if self._is_valid_cell_ref(base_ref):
                dynamic_deps.add(self._parse_cell_ref(base_ref, current_sheet))
        
        self.logger.debug(
            "Extracted dynamic dependencies",
            formula=formula[:50],
            dynamic_dep_count=len(dynamic_deps)
        )
        
        return dynamic_deps

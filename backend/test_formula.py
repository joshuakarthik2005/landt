import openpyxl

wb = openpyxl.load_workbook('test_files/simple_budget.xlsx', data_only=False)
ws = wb.active

print('Testing formula extraction:')
print('=' * 60)

# Test specific formula cells
test_cells = ['F2', 'F3', 'B4', 'B5', 'F5']

for cell_addr in test_cells:
    cell = ws[cell_addr]
    if cell.data_type == 'f':
        print(f'\n{cell_addr}:')
        print(f'  value: {repr(cell.value)}')
        print(f'  data_type: {cell.data_type}')
        print(f'  type: {type(cell.value).__name__}')
        print(f'  starts with =: {str(cell.value).startswith("=")}')
        
        # Our current logic
        formula_str = f"={cell.value}" if not str(cell.value).startswith('=') else str(cell.value)
        print(f'  formula_str: {repr(formula_str)}')

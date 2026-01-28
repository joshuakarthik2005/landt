use pyo3::prelude::*;
use pyo3::types::PyDict;
use calamine::{Reader, open_workbook, Xlsx, Data, Range};
use rayon::prelude::*;

/// Represents a cell with its value and formula
#[pyclass]
#[derive(Clone)]
struct Cell {
    #[pyo3(get)]
    row: u32,
    #[pyo3(get)]
    col: u32,
    #[pyo3(get)]
    value: String,
    #[pyo3(get)]
    formula: Option<String>,
    #[pyo3(get)]
    data_type: String,
}

#[pymethods]
impl Cell {
    fn __repr__(&self) -> String {
        format!(
            "Cell(row={}, col={}, value='{}', formula={:?})",
            self.row, self.col, self.value, self.formula
        )
    }
}

/// Represents a worksheet with all its cells
#[pyclass]
#[derive(Clone)]
struct Sheet {
    #[pyo3(get)]
    name: String,
    #[pyo3(get)]
    cells: Vec<Cell>,
    #[pyo3(get)]
    row_count: u32,
    #[pyo3(get)]
    col_count: u32,
}

#[pymethods]
impl Sheet {
    fn __repr__(&self) -> String {
        format!(
            "Sheet(name='{}', cells={}, rows={}, cols={})",
            self.name,
            self.cells.len(),
            self.row_count,
            self.col_count
        )
    }

    /// Get cell at specific position
    fn get_cell(&self, row: u32, col: u32) -> Option<Cell> {
        self.cells
            .iter()
            .find(|c| c.row == row && c.col == col)
            .cloned()
    }

    /// Get all cells with formulas
    fn get_formula_cells(&self) -> Vec<Cell> {
        self.cells
            .iter()
            .filter(|c| c.formula.is_some())
            .cloned()
            .collect()
    }
}

/// High-performance Excel workbook reader
#[pyclass]
struct ExcelReader {
    path: String,
    sheets: Vec<Sheet>,
}

#[pymethods]
impl ExcelReader {
    #[new]
    fn new(path: String) -> PyResult<Self> {
        Ok(ExcelReader {
            path,
            sheets: Vec::new(),
        })
    }

    /// Parse the entire workbook
    fn parse(&mut self) -> PyResult<()> {
        let mut workbook: Xlsx<_> = open_workbook(&self.path)
            .map_err(|e| PyErr::new::<pyo3::exceptions::PyIOError, _>(format!("Failed to open workbook: {}", e)))?;

        let sheet_names: Vec<String> = workbook.sheet_names().to_vec();

        // Parse sheets in parallel for better performance
        let sheets: Vec<Sheet> = sheet_names
            .par_iter()
            .filter_map(|name| {
                let mut wb: Xlsx<_> = open_workbook(&self.path).ok()?;
                let range = wb.worksheet_range(name).ok()?;
                Some(Self::parse_sheet(name.clone(), range))
            })
            .collect();

        self.sheets = sheets;
        Ok(())
    }

    /// Get all sheets
    fn get_sheets(&self) -> Vec<Sheet> {
        self.sheets.clone()
    }

    /// Get sheet by name
    fn get_sheet(&self, name: &str) -> Option<Sheet> {
        self.sheets.iter().find(|s| s.name == name).cloned()
    }

    /// Get total formula count across all sheets
    fn get_formula_count(&self) -> usize {
        self.sheets
            .iter()
            .map(|s| s.get_formula_cells().len())
            .sum()
    }

    /// Get workbook statistics
    fn get_stats(&self, py: Python) -> PyResult<PyObject> {
        let dict = PyDict::new(py);
        dict.set_item("sheet_count", self.sheets.len())?;
        dict.set_item("formula_count", self.get_formula_count())?;
        
        let total_cells: usize = self.sheets.iter().map(|s| s.cells.len()).sum();
        dict.set_item("total_cells", total_cells)?;

        let sheet_names: Vec<&str> = self.sheets.iter().map(|s| s.name.as_str()).collect();
        dict.set_item("sheet_names", sheet_names)?;

        Ok(dict.into())
    }
}

impl ExcelReader {
    /// Parse a single sheet range into a Sheet struct
    fn parse_sheet(name: String, range: Range<Data>) -> Sheet {
        let (row_count, col_count) = range.get_size();
        let mut cells = Vec::new();

        for (row_idx, row) in range.rows().enumerate() {
            for (col_idx, cell) in row.iter().enumerate() {
                let cell_value = Self::datatype_to_string(cell);
                
                // Check if cell contains a formula
                let formula = if cell_value.starts_with('=') {
                    Some(cell_value.clone())
                } else {
                    None
                };

                let data_type = match cell {
                    Data::Int(_) => "int",
                    Data::Float(_) => "float",
                    Data::String(_) => "string",
                    Data::Bool(_) => "bool",
                    Data::DateTime(_) => "datetime",
                    Data::DateTimeIso(_) => "datetime_iso",
                    Data::DurationIso(_) => "duration_iso",
                    Data::Error(_) => "error",
                    Data::Empty => "empty",
                };

                cells.push(Cell {
                    row: row_idx as u32,
                    col: col_idx as u32,
                    value: cell_value,
                    formula,
                    data_type: data_type.to_string(),
                });
            }
        }

        Sheet {
            name,
            cells,
            row_count: row_count as u32,
            col_count: col_count as u32,
        }
    }

    /// Convert Data to String
    fn datatype_to_string(cell: &Data) -> String {
        match cell {
            Data::Int(i) => i.to_string(),
            Data::Float(f) => f.to_string(),
            Data::String(s) => s.clone(),
            Data::Bool(b) => b.to_string(),
            Data::DateTime(dt) => format!("{:?}", dt),
            Data::DateTimeIso(dt) => dt.clone(),
            Data::DurationIso(d) => d.clone(),
            Data::Error(e) => format!("#{:?}", e),
            Data::Empty => String::new(),
        }
    }
}

/// Python module initialization
#[pymodule]
fn excel_reader(_py: Python, m: &PyModule) -> PyResult<()> {
    m.add_class::<ExcelReader>()?;
    m.add_class::<Sheet>()?;
    m.add_class::<Cell>()?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_cell_creation() {
        let cell = Cell {
            row: 0,
            col: 0,
            value: "100".to_string(),
            formula: Some("=A1+B1".to_string()),
            data_type: "int".to_string(),
        };
        assert_eq!(cell.row, 0);
        assert_eq!(cell.col, 0);
    }
}

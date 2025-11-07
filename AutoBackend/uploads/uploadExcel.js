import path from "path"
import XLSX from "xlsx"

export const uploadExcel = (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" })
    }

    const { uploadedBy, store } = req.body

    const filePath = path.resolve(req.file.path)
    const workbook = XLSX.readFile(filePath)
    const sheetName = workbook.SheetNames[0]
    const sheet = workbook.Sheets[sheetName]
    const jsonData = XLSX.utils.sheet_to_json(sheet)

    // ✅ Keep only required columns
    const filteredData = jsonData.map((row) => ({
      "Bill Date": row["Bill Date"] || "",
      "Service Advisor": row["Service Advisor"] || "",
      "Labour Amt": row["Labour Amt"] || 0,
      "Part Amt": row["Part Amt"] || 0,
      "Work Type": row["Work Type"] || "",
    }))

    // For preview (optional)
    const previewData = filteredData.slice(0, 5)

    // Extract info from file name if needed
    const fileName = req.file.originalname.replace(".xlsx", "")
    const [serviceName, dateRange] = fileName.split("_")
    const [startDate, endDate] = dateRange ? dateRange.split("_to_") : ["", ""]

    return res.status(200).json({
      message: "File uploaded successfully ✅",
      serviceName,
      startDate,
      endDate,
      uploadedBy,
      store,
      totalRows: filteredData.length,
      previewRows: previewData,
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ message: "Error reading Excel file", error })
  }
}

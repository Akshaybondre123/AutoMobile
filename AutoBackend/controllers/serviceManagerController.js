import path from "path";
import XLSX from "xlsx";
import ServiceManagerUpload from "../models/ServiceManagerUpload.js";

// Upload Excel file for Service Manager
export const uploadServiceManagerFile = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "No file uploaded" });
    }

    const { uploadedBy, city, uploadType } = req.body;

    if (!uploadedBy || !city || !uploadType) {
      return res.status(400).json({ 
        message: "Missing required fields: uploadedBy, city, or uploadType" 
      });
    }

    // Validate upload type
    const validTypes = ["ro_billing", "operations", "warranty", "service_booking"];
    if (!validTypes.includes(uploadType)) {
      return res.status(400).json({ 
        message: "Invalid upload type. Must be one of: ro_billing, operations, warranty, service_booking" 
      });
    }

    const filePath = path.resolve(req.file.path);
    const workbook = XLSX.readFile(req.file.path);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const jsonData = XLSX.utils.sheet_to_json(sheet);

    // Log column names for debugging
    if (jsonData.length > 0) {
      console.log(` Upload Type: ${uploadType}`);
      console.log(` Column names found:`, Object.keys(jsonData[0]));
    }

    // Process data based on upload type
    let filteredData = [];
    
    switch (uploadType) {
      case "ro_billing":
        filteredData = jsonData.map((row) => ({
          billDate: row["Bill Date"] || row["Date"] || "",
          serviceAdvisor: row["Service Advisor"] || row["Advisor"] || "",
          labourAmt: parseFloat(row["Labour Amt"] || row["Labour Amount"] || 0),
          partAmt: parseFloat(row["Part Amt"] || row["Parts Amount"] || 0),
          workType: row["Work Type"] || row["Type"] || "",
          roNumber: row["RO Number"] || row["RO No"] || "",
          vehicleNumber: row["Vehicle Number"] || row["Vehicle No"] || "",
          customerName: row["Customer Name"] || row["Customer"] || "",
          totalAmount: parseFloat(row["Total Amount"] || row["Total"] || 0),
        }));
        break;

      case "operations":
        filteredData = jsonData.map((row) => ({
          opPartDescription: row["OP/Part Desc."] || row["OP/Part Desc"] || row["Description"] || row["OP Description"] || row["Part Description"] || "",
          count: parseFloat(row["Count"] || row["Quantity"] || 0),
          amount: parseFloat(row["Amount"] || row["Total"] || 0),
        }));
        break;

      case "warranty":
        filteredData = jsonData.map((row) => ({
          claimDate: row["Claim Date"] || row["Date"] || "",
          claimType: row["Claim Type"] || row["Type"] || row["Warranty Type"] || "",
          status: row["Status"] || "",
          labour: parseFloat(row["Labour"] || row["Labour Amt"] || row["Labour Amount"] || 0),
          part: parseFloat(row["Part"] || row["Part Amt"] || row["Parts Amount"] || 0),
        }));
        break;

      case "service_booking":
        filteredData = jsonData.map((row) => ({
          serviceAdvisor: row["Service Advisor"] || row["Advisor"] || row["SA"] || "",
          btDateTime: row["B.T Date & Time"] || row["BT Date & Time"] || row["BT DateTime"] || row["Date & Time"] || "",
          workType: row["Work Type"] || row["Type"] || row["Service Type"] || "",
          status: row["Status"] || "",
        }));
        break;
    }

    // Extract date range from filename if available
    const fileName = req.file.originalname.replace(".xlsx", "").replace(".xls", "");
    let startDate = "";
    let endDate = "";
    
    // Try to extract dates from filename (format: name_startDate_to_endDate)
    const dateMatch = fileName.match(/(\d{4}-\d{2}-\d{2})_to_(\d{4}-\d{2}-\d{2})/);
    if (dateMatch) {
      startDate = dateMatch[1];
      endDate = dateMatch[2];
    }

    // Save to database
    const upload = new ServiceManagerUpload({
      uploadedBy,
      city,
      uploadType,
      fileName: req.file.originalname,
      startDate,
      endDate,
      totalRows: filteredData.length,
      data: filteredData,
    });

    await upload.save();

    return res.status(200).json({
      message: "File uploaded successfully ✅",
      uploadId: upload._id,
      uploadType,
      city,
      totalRows: filteredData.length,
      uploadDate: upload.uploadDate,
    });
  } catch (error) {
    console.error("Upload error:", error);
    res.status(500).json({ 
      message: "Error processing Excel file", 
      error: error.message 
    });
  }
};

// Get all uploads for a specific Service Manager
export const getServiceManagerUploads = async (req, res) => {
  try {
    const { uploadedBy, city, uploadType } = req.query;

    if (!uploadedBy || !city) {
      return res.status(400).json({ 
        message: "Missing required parameters: uploadedBy and city" 
      });
    }

    const query = { uploadedBy, city };
    
    if (uploadType && uploadType !== "all") {
      query.uploadType = uploadType;
    }

    const uploads = await ServiceManagerUpload.find(query)
      .sort({ uploadDate: -1 })
      .select("-data"); // Exclude data for list view

    return res.status(200).json({
      success: true,
      count: uploads.length,
      uploads,
    });
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ 
      message: "Error fetching uploads", 
      error: error.message 
    });
  }
};

// Get specific upload data with full details
export const getUploadData = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const { uploadedBy, city } = req.query;

    if (!uploadedBy || !city) {
      return res.status(400).json({ 
        message: "Missing required parameters: uploadedBy and city" 
      });
    }

    const upload = await ServiceManagerUpload.findOne({
      _id: uploadId,
      uploadedBy,
      city,
    });

    if (!upload) {
      return res.status(404).json({ 
        message: "Upload not found or access denied" 
      });
    }

    return res.status(200).json({
      success: true,
      upload,
    });
  } catch (error) {
    console.error("Fetch error:", error);
    res.status(500).json({ 
      message: "Error fetching upload data", 
      error: error.message 
    });
  }
};

// Get GM dashboard data (all cities or specific city)
export const getGMDashboardData = async (req, res) => {
  try {
    const { city, dataType } = req.query;

    let query = {};
    if (city && city !== "all") {
      query.city = city;
    }

    let result = {};

    if (dataType === "average" || !dataType) {
      // Get all data types and calculate averages
      const allUploads = await ServiceManagerUpload.find(query);
      
      const groupedByType = {
        ro_billing: [],
        operations: [],
        warranty: [],
        service_booking: [],
      };

      const citiesData = {};

      allUploads.forEach(upload => {
        if (groupedByType[upload.uploadType]) {
          groupedByType[upload.uploadType].push(...upload.data);
        }
        
        // Track city-wise data
        if (!citiesData[upload.city]) {
          citiesData[upload.city] = {
            ro_billing: [],
            operations: [],
            warranty: [],
            service_booking: [],
          };
        }
        if (citiesData[upload.city][upload.uploadType]) {
          citiesData[upload.city][upload.uploadType].push(...upload.data);
        }
      });

      result = {
        dataType: "average",
        cities: Object.keys(citiesData),
        summary: {
          ro_billing: {
            count: groupedByType.ro_billing.length,
            totalRevenue: groupedByType.ro_billing.reduce((sum, item) => 
              sum + (item.totalAmount || 0), 0),
          },
          operations: {
            count: groupedByType.operations.length,
            totalAmount: groupedByType.operations.reduce((sum, item) => 
              sum + (item.amount || 0), 0),
          },
          warranty: {
            count: groupedByType.warranty.length,
            totalClaims: groupedByType.warranty.reduce((sum, item) => 
              sum + (item.labour || 0) + (item.part || 0), 0),
          },
          service_booking: {
            count: groupedByType.service_booking.length,
            totalBookings: groupedByType.service_booking.length,
          },
        },
        citiesData,
      };
    } else if (dataType && dataType !== "all") {
      // Get specific data type
      query.uploadType = dataType;
      const uploads = await ServiceManagerUpload.find(query).sort({ uploadDate: -1 });
      
      const allData = uploads.flatMap(upload => upload.data);
      const cities = [...new Set(uploads.map(u => u.city))];
      
      result = {
        dataType,
        count: allData.length,
        cities,
        uploads: uploads.map(u => ({
          id: u._id,
          fileName: u.fileName,
          uploadDate: u.uploadDate,
          totalRows: u.totalRows,
          city: u.city,
          uploadedBy: u.uploadedBy,
        })),
        data: allData,
      };
    }

    return res.status(200).json(result);
  } catch (error) {
    console.error("GM Dashboard error:", error);
    res.status(500).json({ 
      message: "Error fetching GM dashboard data", 
      error: error.message 
    });
  }
};

// Get aggregated data for dashboard
export const getDashboardData = async (req, res) => {
  try {
    const { uploadedBy, city, dataType } = req.query;

    if (!uploadedBy || !city) {
      return res.status(400).json({ 
        message: "Missing required parameters: uploadedBy and city" 
      });
    }

    let query = { uploadedBy, city };
    let result = {};

    if (dataType === "average") {
      // Get all data types and calculate averages
      const allUploads = await ServiceManagerUpload.find(query);
      
      const groupedByType = {
        ro_billing: [],
        operations: [],
        warranty: [],
        service_booking: [],
      };

      allUploads.forEach(upload => {
        if (groupedByType[upload.uploadType]) {
          groupedByType[upload.uploadType].push(...upload.data);
        }
      });

      result = {
        dataType: "average",
        summary: {
          ro_billing: {
            count: groupedByType.ro_billing.length,
            totalRevenue: groupedByType.ro_billing.reduce((sum, item) => 
              sum + (item.totalAmount || item.labourAmt + item.partAmt || 0), 0),
          },
          operations: {
            count: groupedByType.operations.length,
            totalHours: groupedByType.operations.reduce((sum, item) => 
              sum + (item.hoursSpent || 0), 0),
          },
          warranty: {
            count: groupedByType.warranty.length,
            totalClaims: groupedByType.warranty.reduce((sum, item) => 
              sum + (item.claimAmount || 0), 0),
          },
          service_booking: {
            count: groupedByType.service_booking.length,
            totalBookings: groupedByType.service_booking.length,
          },
        },
        data: groupedByType,
      };
    } else if (dataType && dataType !== "all") {
      // Get specific data type
      query.uploadType = dataType;
      const uploads = await ServiceManagerUpload.find(query).sort({ uploadDate: -1 });
      
      const allData = uploads.flatMap(upload => upload.data);
      
      result = {
        dataType,
        count: allData.length,
        uploads: uploads.map(u => ({
          id: u._id,
          fileName: u.fileName,
          uploadDate: u.uploadDate,
          totalRows: u.totalRows,
        })),
        data: allData,
      };
    } else {
      // Get all data
      const uploads = await ServiceManagerUpload.find(query).sort({ uploadDate: -1 });
      
      result = {
        dataType: "all",
        totalUploads: uploads.length,
        uploads: uploads.map(u => ({
          id: u._id,
          uploadType: u.uploadType,
          fileName: u.fileName,
          uploadDate: u.uploadDate,
          totalRows: u.totalRows,
        })),
      };
    }

    return res.status(200).json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error("Dashboard data error:", error);
    res.status(500).json({ 
      message: "Error fetching dashboard data", 
      error: error.message 
    });
  }
};

// Delete upload
export const deleteUpload = async (req, res) => {
  try {
    const { uploadId } = req.params;
    const { uploadedBy, city } = req.query;

    if (!uploadedBy || !city) {
      return res.status(400).json({ 
        message: "Missing required parameters: uploadedBy and city" 
      });
    }

    const upload = await ServiceManagerUpload.findOneAndDelete({
      _id: uploadId,
      uploadedBy,
      city,
    });

    if (!upload) {
      return res.status(404).json({ 
        message: "Upload not found or access denied" 
      });
    }

    return res.status(200).json({
      success: true,
      message: "Upload deleted successfully",
    });
  } catch (error) {
    console.error("Delete error:", error);
    res.status(500).json({ 
      message: "Error deleting upload", 
      error: error.message 
    });
  }
};

// Reset database - delete all uploads for a user
export const resetDatabase = async (req, res) => {
  try {
    const { uploadedBy, city } = req.query;

    if (!uploadedBy || !city) {
      return res.status(400).json({ 
        message: "Missing required parameters: uploadedBy and city" 
      });
    }

    const result = await ServiceManagerUpload.deleteMany({
      uploadedBy,
      city,
    });

    return res.status(200).json({
      success: true,
      message: `Database reset successfully. Deleted ${result.deletedCount} uploads.`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    console.error("Reset error:", error);
    res.status(500).json({ 
      message: "Error resetting database", 
      error: error.message 
    });
  }
};

/**
 * CSV Field Mapping Utility
 * Maps common CSV column variations to standardized field names
 */

export const fieldMappings = {
  ro_billing: {
    'RO_No': ['RO_No', 'RO No', 'RO Number', 'RO_Number', 'ro_no'],
    'bill_date': ['bill_date', 'Bill Date', 'Date', 'Invoice Date'],
    'service_advisor': ['service_advisor', 'Service Advisor', 'Advisor', 'SA'],
    'labour_amt': ['labour_amt', 'Labour Amount', 'Labor Amount', 'Labour'],
    'part_amt': ['part_amt', 'Part Amount', 'Parts', 'Part Cost'],
    'total_amount': ['total_amount', 'Total Amount', 'Total', 'Amount'],
    'vehicle_number': ['vehicle_number', 'Vehicle Number', 'Vehicle No', 'Reg No'],
    'customer_name': ['customer_name', 'Customer Name', 'Customer', 'Name']
  },
  
  warranty: {
    'RO_No': ['RO_No', 'RO No', 'RO Number', 'RO_Number', 'ro_no'],
    'claim_date': ['claim_date', 'Claim Date', 'Date'],
    'claim_number': ['claim_number', 'Claim Number', 'Claim No'],
    'claim_type': ['claim_type', 'Claim Type', 'Type'],
    'labour_amount': ['labour_amount', 'Labour Amount', 'Labor Amount'],
    'part_amount': ['part_amount', 'Part Amount', 'Parts Amount']
  },
  
  booking_list: {
    'Reg_No': ['Reg_No', 'Reg No', 'Registration Number', 'Vehicle Number'],
    'service_advisor': ['service_advisor', 'Service Advisor', 'Advisor'],
    'bt_date_time': ['bt_date_time', 'BT Date Time', 'Booking Time'],
    'booking_number': ['booking_number', 'Booking Number', 'Booking No'],
    'customer_name': ['customer_name', 'Customer Name', 'Customer']
  },
  
  operations_part: {
    'OP_Part_Code': ['OP_Part_Code', 'OP Part Code', 'Operation Code', 'Part Code'],
    'op_part_description': ['op_part_description', 'Description', 'Part Description'],
    'labour_time': ['labour_time', 'Labour Time', 'Time'],
    'part_cost': ['part_cost', 'Part Cost', 'Cost', 'Amount']
  }
};

export const mapCSVFields = (csvRow, fileType) => {
  const mapping = fieldMappings[fileType];
  if (!mapping) return csvRow;
  
  const mappedRow = {};
  
  Object.keys(mapping).forEach(standardField => {
    const possibleFields = mapping[standardField];
    
    for (const field of possibleFields) {
      if (csvRow[field] !== undefined) {
        mappedRow[standardField] = csvRow[field];
        break;
      }
    }
  });
  
  // Copy unmapped fields as-is
  Object.keys(csvRow).forEach(field => {
    const isAlreadyMapped = Object.values(mapping).some(fields => fields.includes(field));
    if (!isAlreadyMapped) {
      mappedRow[field] = csvRow[field];
    }
  });
  
  return mappedRow;
};

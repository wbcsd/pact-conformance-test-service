// Sample footprint data that matches the structure expected in the code
export const mockFootprints = {
  data: [
    {
      id: "123e4567-e89b-12d3-a456-426614174000",
      specVersion: "2.0.0",
      version: 1, // Changed to integer
      status: "Active", // Changed to match the enum
      comment: "This is a test footprint",
      companyName: "Test Company",
      companyIds: ["urn:example:company:test-company"],
      productDescription: "Test product description",
      productCategoryCpc: "Test category",
      productNameCompany: "Test Product",
      productIds: ["urn:product-id-1", "urn:product-id-2"],
      pcf: {
        declaredUnit: "kilogram",
        carbonFootprintTotalkg: 10.5,
        carbonFootprintBreakdown: {},
        // Adding required fields for pcf with correct types
        unitaryProductAmount: "1.0", // Changed to string
        referencePeriodStart: "2025-01-01T00:00:00Z",
        referencePeriodEnd: "2025-12-31T23:59:59Z",
        pCfExcludingBiogenic: "10.5", // Changed to string
        fossilGhgEmissions: "10.0", // Changed to string
        fossilCarbonContent: "1.0", // Changed to string
        biogenicCarbonContent: "0.5", // Changed to string
        characterizationFactors: "AR5", // Changed to match enum
        ipccCharacterizationFactorsSources: ["AR5"],
        crossSectoralStandardsUsed: ["GHG Protocol Product standard"], // Updated to match enum
        boundaryProcessesDescription: "Test boundary processes",
        exemptedEmissionsPercent: 0,
        exemptedEmissionsDescription: "No exempted emissions",
        packagingEmissionsIncluded: true,
      },
      created: "2025-01-01T00:00:00Z",
    },
  ],
};

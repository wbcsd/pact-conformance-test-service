# Automated Conformance Testing FAQ

### What is tested by the Atomated Conformance Testing tool?
Mandatory functionality of the PACT Technical Specifications are tested. The tool runs a comprehensive set of test cases, which varies by Technical Specification version. Test cases include both a validation of teh data model schema as well as mandatory API functionality. See the set of test cases [here](docs/ACT_Test_Cases.pdf)

### What solution pre-requisites are required to pass all tests?
- Solution must implement all mandatory functionality of the PACT Technical Specifications
- Solution must return 2 or more PCFs via a call to ListFootprints, i.e. solution must have 2 PCFs available and pre-configured to release these PCFs to the ACT tool

### How is Authentication information handled?
ACT requires users to provide the Solution API URl and `client_id` and `client_secret` to authentication to their solution and run tests. This authentication information is only stored in memory during testing and will never be saved nor transferred.

### What is the time duration of the tests?
30 seconds. Some tests are evaluated immediately (i.e. via synchronous requests); those tests that require an asynchronous response is evaluated for a duration of 30 seconds, after which if the response is not received, the test is marked as failed. 


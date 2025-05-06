# ACT Versioning and Retesting Policy
We recognize as with any software, user feedback will heavily shape improvements to the ACT over time. We plan to actively continue developing and maintaining MVP following its initial release (see the [public backlog](https://github.com/orgs/wbcsd/projects/4) for details). Further, we also recognize it is impossible to guarantee the first launched version of ACT for any given version of the PACT Technical Specifications will be bug-free and contain a fully comprehensive testing suite.  

Therefore, we present below the versioning scheme and governance processes we will use to ensure ACT versions will be managed clearly and simply. We also present the implication of ACT versions on PACT Conformance status, ensuring rigor, consistency, simplicity, and integrity.


## ACT Versioning Scheme
- ACT will be regularly maintained, enhanced, and released
- ACT releases will be numbered according to [semantic versioning](https://semver.org/)
- Every minor and major release of the PACT Technical Specifications will correspond to a related ACT release; ACT however will release much more frequently than PACT Tech Specs
- We will begin the semantic versioning scheme of ACT with the Beta Phase Release

  
| Phase    | Description | Timeframe
| -------- | ------- | ------- |
| MVP / Alpha Phase  | Rapid test & iterate, open to closed community of PACT Conformant Solutions  | April 2025
| Beta Phase | Public release; conformance is subject to potential mandatory re-testing    | June - TBD 2025
| General Release    | Stabilized tool with comprehensive test suite; conformance is not subject to mandatory re-testing   | Q4* 2025 

\* ACT will only be released in the "General Release" phase once the tool is stabilized and robust to ensure conformance results are fully reliable and integrous; we anticipate multiple criteria must be met before ACT will be promoted to General Release, including: issue rate, number of solutions having 100% tests passing, time to conformance, etc.


## ACT / Tech Specs discrepancy resolution process
We acknowledge that during the use of ACT, and especially throughout the Alpha and Beta Phases, the community may encounter questions regarding discrepancies and/or differences of interpretation between the Tech Specs and ACT. This is expected and our goal with ACT is to systematically address and remove these discrepancies, thus driving interoperability robustness. We will use the process defined below to resolve discrepancies / issues with ACT as a community,
* During use of ACT, a Solution Provider is expected to share feedback if they encounter any of the following, per their interpretation: 
  * a test case of ACT does not correctly implement the PACT Tech Specs
  * PACT Tech Specs are ambiguous and therefore a discrepancy exists between ACT and PACT Tech Specs
  * a test case is missing in ACT which the Solution Provider believes is mandatory and should be tested 
* A Solution Provider is requested to raise a [GitHub issue](https://github.com/wbcsd/pact-conformance-test-service/issues) documenting: 
  * The test case
  * The problem observed
  * Proposed resolution (i.e. to Tech Specs and/or ACT)
* PACT will review issues regularly and triage accordingly:
  * Issues having implications to conformance for Solution Providers (i.e. discrepancies in interpretation, ambiguity, etc.) will be raised to PACT Technology Working Group, consensus reached, and corresponding updates to PACT Tech Specs and/or ACT will be implemented
  * Issues that do not require consultation from Working Group (i.e. obvious bugs, etc.) will be resolved directly by PACT team
  * Every attempt will be made to update the PACT Tech Specs to iteratively remove ambiguities and retain the PACT Tech Specs as the source of truth, with the ACT implementing the PACT Tech Specs
* PACT will close the issue and log the corresponding decision made; PACT will update ACT and the update will be made available in the next release
* Depending on the severity of the issue raised and the phase of ACT (i.e. in Beta Phase), a conformance retesting period may be required 

## Conformance subject to potential retesting in Beta Phase
The following policy was determined in consultation with the PACT community, and is a compromise between 1) ensuring and enforcing the integrity of PACT Conformance and 2) not imposing an undue burden or requirement on Solution Providers to mandate retesting (and/or undue burden on PACT organization to enforce mandatory retesting indefinitely), which ultimately the (ideally) the market should enforce  
* The above discrepancy resolution process may generate a scenario which we will call a “mandatory retesting scenario”, where solutions which previously passed ACT for a given version of the Tech Specs would no longer pass ACT for that same version.
* The scenario requiring retesting is only expected in the "Beta Phase"; once ACT is in General Release for a given version of the PACT Technical Specifications, organizations will not be required (by PACT) to participate in retesting.
* Should a mandatory retesting scenario occur, we anticipate the following process:
  * If PACT determines that a new version of ACT requires existing conformant solutions to undergo retesting, PACT will notify the Solution Provider, granting them 60 days to re-demonstrate conformance.
  * During this time the Solution Provider will continue to be promoted through PACT marketing channels as before (i.e. via PACT website, at events, etc.)
  * Should the Solution Provider fail to re-demonstrate conformance by the deadline, PACT will inform the Solution Provider, remove their Conformance status, and remove the solution from PACT marketing channels.
* Solution Providers are regardless encouraged to periodically retest to later versions of ACT, even if not mandated to do so. Further we also encourage the customers (and/or potential customers) of Solution Providers to request or mandate re-testing if they have reason to believe their Solution Provider is no longer conformant.
 

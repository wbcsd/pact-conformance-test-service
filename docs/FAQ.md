# Automated Conformance Testing FAQ

Work-in-progress!

### How is Authentication information handled?
ACT requires users to provide the Solution API URl and `client_id` and `client_secret` to authentication to their solution and run tests. This authentication information is only stored in memory during testing and will never be saved nor transferred.

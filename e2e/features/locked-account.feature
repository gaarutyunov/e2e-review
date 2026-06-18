Feature: Locked account messaging
  As a user whose account is locked
  I want a clear message telling me to contact support
  So that I know why I cannot sign in

  # NOTE: This scenario intentionally FAILS. The demo app shows a generic
  # "Invalid email or password" error instead of a locked-account message.
  # It exists so the review app and the MCP server always have a failing run
  # to inspect, comment on, and hand to an agent to fix.
  Background:
    Given the login page is open

  @demo-failure
  Scenario: Locked-out user sees a helpful message
    When I enter the email "locked@acme.test"
    And I enter the password "whatever"
    And I click the sign in button
    Then I should see the error "Your account is locked, please contact support"

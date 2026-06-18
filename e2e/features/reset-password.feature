Feature: Reset password
  As a user who forgot their password
  I want to set a new password
  So that I can sign in again

  Background:
    Given the login page is open

  Scenario: Reset the password and sign in with the new one
    When I click the forgot password link
    And I request a password reset for "user@acme.test"
    And I set the new password to "NewPassword123!"
    Then I should see the reset success message
    When I go back to sign in
    And I enter the email "user@acme.test"
    And I enter the password "NewPassword123!"
    And I click the sign in button
    Then I should see the dashboard

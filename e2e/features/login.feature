Feature: Login
  As a returning user
  I want to sign in with my email and password
  So that I can reach my dashboard

  Background:
    Given the login page is open

  @smoke
  Scenario: Successful login with valid credentials
    When I enter the email "user@acme.test"
    And I enter the password "Password123!"
    And I click the sign in button
    Then I should see the dashboard
    And I should see my name "Ada Lovelace"

  Scenario: Login fails with wrong credentials
    When I enter the email "user@acme.test"
    And I enter the password "wrong-password"
    And I click the sign in button
    Then I should see the error "Invalid email or password"

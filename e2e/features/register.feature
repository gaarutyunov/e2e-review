Feature: Register
  As a new user
  I want to create an account
  So that I can access the application

  Background:
    Given the login page is open

  Scenario: Register a new account
    When I click the register link
    And I register with name "Grace Hopper", organization "Acme Corp", email "grace@acme.test" and password "Password123!"
    Then I should see the dashboard
    And I should see my name "Grace Hopper"

/* eslint-disable no-unused-vars */
/* eslint-disable no-const-assign */
/* eslint-disable no-undef */
let studentSubmissionUrl = Cypress.env("STUDENT_SUBMISSION_URL") || "http://localhost:3000";
if (studentSubmissionUrl.endsWith("/")) {
    studentSubmissionUrl = studentSubmissionUrl.slice(0, -1);
}

describe("Colab Application Tests", () => {
    it("Sign Up", () => {
        cy.request("POST", "/users", {
            firstName: "Test",
            lastName: "user A",
            email: "user.a@gmail.com",
            mobileNumber: "0000000000",
            password: "12345678",
            username: "testUser"
        }).then((response) => {
            expect(response.status).to.equal(200);
        });
    });

    it("Sign In", () => {
        cy.request("POST", "/session", {
            email: "user.a@gmail.com",
            password: "12345678"
        }).then((response) => {
            expect(response.status).to.equal(200);
        });
    });

    it("Create a Blog", () => {
        cy.request("POST", "/session", {
            email: "user.a@gmail.com",
            password: "12345678"
        }).then((loginResponse) => {
            cy.request({
                method: "POST",
                url: "/publisher/createBlog",
                body: {
                    blogTitle: "test blog",
                    blogThumbnail: "",
                    blogDescription: "test description",
                    location: "test location",
                    date: new Date().toISOString(),
                    userID: 1
                },
                headers: {
                    Authorization: `Bearer ${loginResponse.body.token}`
                }
            }).then((response) => {
                expect(response.status).to.equal(200);
            });
        });
    });
    
    it("Update a Blog", () => {
        cy.request("POST", "/session", {
            email: "user.a@gmail.com",
            password: "12345678"
        }).then((loginResponse) => {
            cy.request({
                method: "PATCH",
                url: "/publisher/blogs/1/1",
                body: {
                    blogTitle: "Updated Test Blog",
                    blogDescription: "Updated Test Description",
                    location: "Updated Test Location"
                },
                headers: {
                    Authorization: `Bearer ${loginResponse.body.token}`
                }
            }).then((response) => {
                expect(response.status).to.equal(200);
            });
        });
    });
    
    it("Delete a Blog", () => {
        cy.request("POST", "/session", {
            email: "user.a@gmail.com",
            password: "12345678"
        }).then((loginResponse) => {
            cy.request({
                method: "DELETE",
                url: "/publisher/blogs/1/1",
                headers: {
                    Authorization: `Bearer ${loginResponse.body.token}`
                }
            }).then((response) => {
                expect(response.status).to.equal(200);
            });
        });
    });
    
});

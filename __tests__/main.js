/* eslint-disable no-undef */
/* eslint-disable no-unused-vars */
const request = require("supertest");
var cheerio = require("cheerio");
const db = require("../models/index");
const app = require("../app");
// const passport = require("passport");
const Blog = require("../models/blog");


let server, agent;

const login = async (agent, email, password) => {
    let res = await agent.post("/session").send({
        email: email,
        password: password,
    });
    // Extract and return the token from the response
    return res.body.token;
};
describe("Colab Application", function () {
    beforeAll(async () => {
        await db.sequelize.sync({ force: true });
        server = app.listen(4000, () => { });
        agent = request.agent(server);
    });

    afterAll(async () => {
        try {
            await db.sequelize.close();
            await server.close();
        } catch (error) {
            console.log(error);
        }
    });

    test("Sign up", async () => {
        let res = await agent.get("/users");
        res = await agent.post("/users").send({
            firstName: "Test",
            lastName: "user A",
            email: "user.a@gmail.com",
            mobileNumber: "0000000000",
            password: "12345678",
            username: "testUser"
        });
        expect(res.statusCode).toBe(200);
    });

    test("Sign in", async () => {
        let res = await agent.get("/session");
        res = await agent.post("/session").send({
            email: "user.a@gmail.com",
            password: "12345678"
        });
        expect(res.statusCode).toBe(200);
    });

    test("create a blog", async () => {
        // Sign in the user and obtain the token
        const token = await login(agent, "user.a@gmail.com", "12345678");
    
        // After signing in, attempt to create a blog
        let res = await agent
            .post("/publisher/createBlog")
            .set('Authorization', 'Bearer ' + token) // Include the token in the request header
            .send({
                blogTitle: "test blog",
                blogThumbnail: "",
                blogDescription: "test description",
                location: "test location",
                date: new Date().toISOString(),
                userID: 1, // Assuming the user ID is 1
            });
    
        expect(res.statusCode).toBe(200);
    });   

    test("update a blog", async () => {
        // Sign in the user and obtain the token
        const token = await login(agent, "user.a@gmail.com", "12345678");
    
        // Attempt to update the blog
        const updatedBlogData = {
            blogTitle: "Updated Test Blog",
            blogDescription: "Updated Test Description",
            location: "Updated Test Location",
        };
    
        let res = await agent
            .patch(`/publisher/blogs/1/1`)
            .set('Authorization', 'Bearer ' + token)
            .send(updatedBlogData);
    
        // Check the response
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty("blogTitle", updatedBlogData.blogTitle);
        expect(res.body).toHaveProperty("blogDescription", updatedBlogData.blogDescription);
        expect(res.body).toHaveProperty("location", updatedBlogData.location);
    });  

    test("delete a blog", async () => { 
        // Sign in the user and obtain the token
        const token = await login(agent, "user.a@gmail.com", "12345678");
    
        // Attempt to delete the blog
        let res = await agent
            .delete(`/publisher/blogs/1/1`)
            .set('Authorization', 'Bearer ' + token);
    
        // Check the response
        expect(res.statusCode).toBe(200);
    });
}); 
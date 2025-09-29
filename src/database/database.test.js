const request = require('supertest');
const app = require('../service');

// const testUser = { name: 'pizza diner', email: 'reg@test.com', password: 'a' };
// let testUserAuthToken;

if (process.env.VSCODE_INSPECTOR_OPTIONS) {
  jest.setTimeout(60 * 1000 * 2); // 2 minutes
}

// function expectValidJwt(potentialJwt) {
//   expect(potentialJwt).toMatch(/^[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*\.[a-zA-Z0-9\-_]*$/);
// }

// This block is too satisfy the eslint
let regularUser;
let adminUser;
// let newStore;
let newFranchise;
// let regUserFranchise; 
let adminAuthToken;
let regularAuthToken;
let userLoginResId;

const { Role, DB } = require('../database/database.js');

async function createAdminUser() {
  let user = { password: "toomanysecrets", roles: [{ role: Role.Admin }] };
  user.name = randomName();
  user.email = user.name + "@admin.com";

  await DB.addUser(user);

  user.password = "toomanysecrets";
  return user;
}

function randomName() {
  return Math.random().toString(36).substring(2, 12);
}

// very helpful franchise and admin user setup
beforeAll(async () => {
  regularUser = await {
    name: "pizza diner",
    email: "reg@test.com",
    password: "a",
  };

//   newStore = await {
//     id: randomName(),
//     name: randomName(),
//     totalRevenue: 1000,
//   };

  regularUser.email = Math.random().toString(36).substring(2, 12) + "@test.com";
  adminUser = await createAdminUser();
  // console.log(adminUser);

  newFranchise = {
    name: randomName(),
    admins: [{ email: adminUser.email }],
    stores: [{ id: randomName(), name: randomName(), totalRevenue: 1000 }],
  };

//   regUserFranchise = {
//     name: randomName(),
//     admins: [{ email: regularUser.email }],
//     stores: [{ id: randomName(), name: randomName(), totalRevenue: 1000 }],
//   };

  const userLoginRes = await request(app).post("/api/auth").send(regularUser);
  const loginRes = await request(app).put("/api/auth").send(adminUser);
  adminAuthToken = loginRes.body.token;
  regularAuthToken = userLoginRes.body.token;
  // console.log("Admin Login Res: ", loginRes.body);
  // console.log("User Login Res: ", userLoginRes.body);
  userLoginResId = userLoginRes.body.user.id;
});

// Menu Tests'

test('getMenu', async () => {
    // testUser.email = Math.random().toString(36).substring(2, 12) + '@test.com';
    // const registerRes = await request(app).post('/api/auth').send(testUser);
    // testUserAuthToken = registerRes.body.token;
    // expectValidJwt(testUserAuthToken);
    const res = await request(app).get('/api/order/menu');
    expect(res.status).toBe(200);
    // expect(res.body.length).toBeGreaterThan(0);
});

test('addMenuItem', async () => {
    const newMenuItem = {
        title: 'MegaPizza', 
        description: 'A pizza that is MASSIVE', 
        image: 'pizza9.png',
        price: 10.00
    };
    const res = await request(app).put('/api/order/menu').set('Authorization', `Bearer ${adminAuthToken}`).send(newMenuItem);
    expect(res.status).toBe(200); 
});

test('getOrders', async () => {
    const res = await request(app).get('/api/order').set('Authorization', `Bearer ${regularAuthToken}`);
    expect(res.status).toBe(200);
    expect(res.body.dinerId).toBe(userLoginResId);
});

// Franchise Tests
test('createFranchise', async () => {
    const res = await request(app).post('/api/franchise').set('Authorization', `Bearer ${adminAuthToken}`).send(newFranchise);
    expect(res.status).toBe(200);
});

test('deleteFranchise', async () => {
    const res = await request(app).delete(`/api/franchise/${newFranchise.name}`).set('Authorization', `Bearer ${adminAuthToken}`);
    expect(res.status).toBe(200);
});

test('getFranchises', async () => {
    const res = await request(app).get('/api/franchise').set('Authorization', `Bearer ${adminAuthToken}`);
    expect(res.status).toBe(200);
});

test('getFranchise', async () => {
    const res = await request(app).get(`/api/franchise/${newFranchise.name}`).set('Authorization', `Bearer ${adminAuthToken}`);
    expect(res.status).toBe(200);
});

test('getUserFranchises', async () => {
    const res = await request(app).get('/api/franchise/user').set('Authorization', `Bearer ${regularAuthToken}`);
    expect(res.status).toBe(200);
});

// User Tests

test('updateUser', async () => {
    const updatedUser = {
        ...regularUser,
        password: 'newpassword',
    };
    const res = await request(app).put(`/api/user/${userLoginResId}`).set('Authorization', `Bearer ${adminAuthToken}`).send(updatedUser);
    // console.log(res.body);
    expect(res.status).toBe(200);
});

test('logout', async () => {
    const res = await request(app).delete('/api/auth').set('Authorization', `Bearer ${regularAuthToken}`);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('logout successful');
});
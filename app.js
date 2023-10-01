const express = require("express");
const path = require("path");
const app = express();
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");

const dbPath = path.join(__dirname, "covid19India.db");
app.use(express.json());
let db = null;
const initializeDBAndServer = async (request, response) => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3005, () => {
      console.log("Server is running");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertStatesToResponseObj = (dbObject) => {
  return {
    stateId: dbObject.state_id,
    stateName: dbObject.state_name,
    population: dbObject.population,
  };
};

//API-1
app.get("/states/", async (request, response) => {
  const query1 = `SELECT * FROM state ORDER BY state_id`;
  const statesArray = await db.all(query1);
  response.send(statesArray.map((state) => convertStatesToResponseObj(state)));
});
//API-2
app.get("/states/:stateId/", async (request, response) => {
  const { stateId } = request.params;
  const query2 = `SELECT * FROM state WHERE state_id = ${stateId};`;
  const oneState = await db.get(query2);
  response.send(convertStatesToResponseObj(oneState));
});
//API-3
app.post("/districts/", async (request, response) => {
  const districtDetails = request.body;
  const {
    districtName,
    stateId,
    cases,
    cured,
    active,
    deaths,
  } = districtDetails;
  const query3 = `INSERT INTO district (district_name,state_id,cases,cured,active,deaths)
  VALUES (
      '${districtName}',
      ${stateId},
      ${cases},
      ${cured},
      ${active},
      ${deaths});`;
  const dbResponse = await db.run(query3);
  response.send("District Successfully Added");
});

const convertDistToResponseObj = (dbObject) => {
  return {
    districtId: dbObject.district_id,
    districtName: dbObject.district_name,
    stateId: dbObject.state_id,
    cases: dbObject.cases,
    cured: dbObject.cured,
    active: dbObject.active,
    deaths: dbObject.deaths,
  };
};

//API-4
app.get("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const query4 = `SELECT * FROM 
  district 
  WHERE district_id = ${districtId}`;
  const oneDistrict = await db.get(query4);
  response.send(convertDistToResponseObj(oneDistrict));
});

//API-5
app.delete("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  const query5 = `DELETE 
    FROM 
    district 
    WHERE 
    district_id = ${districtId}`;
  await db.run(query5);
  response.send("District Removed");
});
//API-6
app.put("/districts/:districtId/", async (request, response) => {
  const { districtId } = request.params;
  //const districtDetails = request.body;
  const { districtName, stateId, cases, cured, active, deaths } = request.body;
  const query6 = `UPDATE district 
    SET 
    district_name = '${districtName}',
    state_id = ${stateId},
    cases = ${cases},
    cured = ${cured},
    active = ${active},
    deaths = ${deaths}
    WHERE 
    district_id = ${districtId}`;
  const res = await db.run(query6);
  response.send("District Details Updated");
});
//API-7
app.get("/states/:stateId/stats/", async (request, response) => {
  const { stateId } = request.params;
  const query7 = `SELECT 
    SUM(cases),
    SUM(cured),
    SUM(active),
    SUM(deaths)
    FROM district
    WHERE state_id = ${stateId};`;
  const stats = await db.get(query7);
  response.send({
    totalCases: stats["SUM(cases)"],
    totalCured: stats["SUM(cured)"],
    totalActive: stats["SUM(active)"],
    totalDeaths: stats["SUM(deaths)"],
  });
});

//API-8
app.get("/districts/:districtId/details/", async (request, response) => {
  const { districtId } = request.params;
  const getDistrictIdQuery = `
    select state_id from district
    where district_id = ${districtId};
    `;
  const getDistrictIdQueryResponse = await db.get(getDistrictIdQuery);
  const getStateNameQuery = `
    select state_name as stateName from state
    where state_id = ${getDistrictIdQueryResponse.state_id};
    `;
  const getStateNameQueryResponse = await db.get(getStateNameQuery);
  response.send(getStateNameQueryResponse);
});

module.exports = app;

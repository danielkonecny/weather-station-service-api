/**
 * Weather Station Service API
 * @author Daniel Konecny
 */

const express = require('express');
const app = express();
const port = 3000;
const fs = require('fs');

let db = JSON.parse(fs.readFileSync('./db.json'));

const usernameField = ["username"];

const codeField = ["code"];

const userFields = [
    "name",
    "dateOfBirth",
    "address",
    "city",
    "country",
    "email"
];

const sensorFields = [
    "deviceType",
    "description",
    "locationLatitude",
    "locationLongitude",
    "sensorType"
];

const measurementFields = [
    "code",
    "measurement",
    "dateTime"
];

const timeFields = [
    "startTime",
    "endTime"
];

function checkFields(requestFields, requiredFields, optionalFields) {
    let incorrectFields = [];

    // Check required fields.
    for (let field of requiredFields) {
        let index = requestFields.indexOf(field);
        if (index === -1) {
            incorrectFields.push(field);
        } else {
            requestFields.splice(index, 1);
        }
    }

    // Check optional fields and other fields.
    for (let field of requestFields) {
        if (optionalFields.indexOf(field) === -1) {
            incorrectFields.push(field);
        }
    }

    return incorrectFields;
}

app.use(express.json());

app.get('/users', function (req, res) {
    res.status(200).json(db.data);
});

app.post('/users', function (req, res) {
    let incorrectFields = checkFields(Object.keys(req.body), usernameField.concat(userFields), []);

    if (incorrectFields.length) {
        let body = {incorrectFields};
        res.status(400).json(body);
    } else {
        req.body.id = db.userId;
        req.body.sensors = [];
        db.data.push(req.body);

        const result = {id: db.userId};
        db.userId++;
        db.sensorId.push(0);
        res.status(201).json(result);
    }
});

app.get("/users/:userId", function (req, res) {
    for (let user = 0; user < db.data.length; user++) {
        if (db.data[user].id === parseInt(req.params.userId)) {
            res.status(200).json(db.data[user].sensors);
            return;
        }
    }
    res.sendStatus(404);
});

app.post("/users/:userId", function (req, res) {
    let incorrectFields = checkFields(Object.keys(req.body), sensorFields, []);

    if (incorrectFields.length) {
        let body = {incorrectFields};
        res.status(400).json(body);
    } else {
        for (let user = 0; user < db.data.length; user++) {
            if (db.data[user].id === parseInt(req.params.userId)) {
                let newCode = "2f4-23K-992-" + db.sensorId[user].toString().padStart(3, "0");
                db.sensorId[user]++;

                req.body.code = newCode;
                req.body.measurements = [];
                db.data[user].sensors.push(req.body);

                const result = {code: newCode};
                res.status(201).json(result);
                return;
            }
        }
        res.sendStatus(404);
    }
});

app.put("/users/:userId", function (req, res) {
    let incorrectFields = checkFields(Object.keys(req.body), [], userFields);

    if (incorrectFields.length) {
        let body = {incorrectFields};
        res.status(400).json(body);
    } else {
        for (let user = 0; user < db.data.length; user++) {
            if (db.data[user].id === parseInt(req.params.userId)) {
                for (let userKey in db.data[user]) {
                    for (let editKey in req.body) {
                        if (userKey === editKey) {
                            db.data[user][userKey] = req.body[editKey];
                        }
                    }
                }
                res.sendStatus(200);
                return;
            }
        }
        res.sendStatus(404);
    }
});

app.delete("/users/:userId", function (req, res) {
    for (let user = 0; user < db.data.length; user++) {
        if (db.data[user].id === parseInt(req.params.userId)) {
            db.data.splice(user, 1);
            res.sendStatus(200);
            return;
        }
    }
    res.sendStatus(404);
});

app.get("/users/:userId/sensors", function (req, res) {
    let incorrectFields = checkFields(Object.keys(req.body), codeField, timeFields);
    let startTime = new Date(1900, 1, 1);
    let endTime = Date.now();
    let responseBody = {};

    if (incorrectFields.length) {
        let body = {incorrectFields};
        res.status(400).json(body);
    } else {
        for (let user = 0; user < db.data.length; user++) {
            if (db.data[user].id === parseInt(req.params.userId)) {
                responseBody.name = db.data[user].name;
                for (let sensor = 0; sensor < db.data[user].sensors.length; sensor++) {
                    if (db.data[user].sensors[sensor].code === req.body.code) {
                        responseBody.measurements = [];
                        if(req.body.hasOwnProperty("startTime")) {
                            startTime = new Date(req.body.startTime);
                        }
                        if(req.body.hasOwnProperty("endTime")) {
                            endTime = new Date(req.body.endTime);
                        }
                        if(startTime > endTime) {
                            res.status(400).json({incorrectFields: ["startTime", "endTime"]});
                        }
                        for(let measurement of db.data[user].sensors[sensor].measurements) {
                            let measurementTime = new Date(measurement.dateTime);
                            if (measurementTime >= startTime && measurementTime <= endTime) {
                                responseBody.measurements.push(measurement);
                            }
                        }
                        res.status(200).json(responseBody);
                        return;
                    }
                }
                res.sendStatus(404);
            }
        }
        res.sendStatus(404);
    }
});

app.post("/users/:userId/sensors", function (req, res) {
    let incorrectFields = checkFields(Object.keys(req.body), measurementFields, []);

    if (incorrectFields.length) {
        let body = {incorrectFields};
        res.status(400).json(body);
    } else {
        for (let user = 0; user < db.data.length; user++) {
            if (db.data[user].id === parseInt(req.params.userId)) {
                for (let sensor = 0; sensor < db.data[user].sensors.length; sensor++) {
                    if (db.data[user].sensors[sensor].code === req.body.code) {
                        db.data[user].sensors[sensor].measurements.push({
                            measurement: req.body.measurement,
                            dateTime: req.body.dateTime
                        });
                        res.sendStatus(201);
                        return;
                    }
                }
                res.sendStatus(404);
            }
        }
        res.sendStatus(404);
    }
});

app.put("/users/:userId/sensors", function (req, res) {
    let incorrectFields = checkFields(Object.keys(req.body), codeField, sensorFields);
    if (incorrectFields.length) {
        let body = {incorrectFields};
        res.status(400).json(body);
    } else {
        for (let user = 0; user < db.data.length; user++) {
            if (db.data[user].id === parseInt(req.params.userId)) {
                for (let sensor = 0; sensor < db.data[user].sensors.length; sensor++) {
                    if (db.data[user].sensors[sensor].code === req.body.code) {
                        for (let sensorKey in db.data[user].sensors[sensor]) {
                            for (let editKey in req.body) {
                                if (sensorKey === editKey) {
                                    db.data[user].sensors[sensor][sensorKey] = req.body[editKey];
                                }
                            }
                        }
                        res.sendStatus(200);
                        return;
                    }
                }
            }
        }
        res.sendStatus(404);
    }
});

app.delete("/users/:userId/sensors", function (req, res) {
    let incorrectFields = checkFields(Object.keys(req.body), codeField, []);
    if (incorrectFields.length) {
        let body = {incorrectFields};
        res.status(400).json(body);
    } else {
        for (let user = 0; user < db.data.length; user++) {
            if (db.data[user].id === parseInt(req.params.userId)) {
                for (let sensor = 0; sensor < db.data[user].sensors.length; sensor++) {
                    if (db.data[user].sensors[sensor].code === req.body.code) {
                        db.data[user].sensors.splice(sensor, 1);
                        res.sendStatus(200);
                        return;
                    }
                }
                res.sendStatus(404);
            }
        }
        res.sendStatus(404);
    }
});

const saveDb = () => {
    fs.writeFileSync("./db.json", JSON.stringify(db));
};

process.on("beforeExit", saveDb);

process.on("SIGINT", () => {
    saveDb();
    process.exit();
});

app.listen(port, () => console.log(`Example app listening on port ${port}!`));

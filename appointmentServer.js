const readline = require("readline").createInterface({
  input: process.stdin,
  output: process.stdout,
});

var fs = require("fs");
var ejs = require("ejs");
const express = require("express");
const path = require("path");
require("dotenv").config();
const app = express();

const { MongoClient, ServerApiVersion } = require("mongodb");
const uri = `mongodb+srv://${process.env.MONGO_DB_USERNAME}:${process.env.MONGO_DB_PASSWORD}@cluster0.cw5ix.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});
const databaseAndCollection = {
  db: process.env.MONGO_DB_NAME,
  collection: process.env.MONGO_COLLECTION,
};

const databaseAndCollection2 = {
  db: process.env.MONGO_DB_NAME,
  collection: process.env.MONGO_COLLECTION2,
};

let port = 5000;

app.use(express.json());
app.use(express.urlencoded());
app.use(express.static(__dirname + "/public"));

if (process.argv.length == 3) {
  port = process.argv[2];
}

var server = app.listen(port, () => {
  console.log(`Web server started and running at http://localhost:${port}`);

  readline.question("Type stop to shutdown the server: ", (command) => {
    runReadLine(command);

    readline.setPrompt("Type stop to shutdown the server: ");
    readline.on("line", (command2) => {
      runReadLine(command2);
    });
  });
});

var runReadLine = function (command) {
  if (command == "stop") {
    console.log("Shutting down the server");
    readline.close();
    server.close();
    process.exit(0);
  } else {
    console.log(`Invalid command: ${command}`);
    readline.prompt();
  }
};

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "/html/index.html"));
});

app.get("/schedule", (req, res) => {
  res.sendFile(path.join(__dirname, "/html/schedule.html"));
});

app.post("/processSchedule", async (req, res) => {
  let result;
  try {
    await client.connect();
    await client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .insertOne({
        name: req.body.name,
        email: req.body.email,
        time: req.body.appt,
        date: req.body.timestamp,
        id: `${Math.random()}`,
        info: req.body.info == "" ? "N/A" : req.body.info,
        confirmed: false,
      });
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
    var templateString = fs.readFileSync("html/process.ejs", "utf-8");
    res.end(
      ejs.render(templateString, {
        name: req.body.name,
        email: req.body.email,
        time: req.body.appt,
        date: req.body.timestamp,
        info: req.body.info == "" ? "N/A" : req.body.info,
        confirmed: "Not Confirmed",
      })
    );
  }
});

app.get("/reviewApplication", (req, res) => {
  res.sendFile(path.join(__dirname, "/html/reviewApplication.html"));
});

app.post("/processReviewApplication", async (req, res) => {
  let resu;
  try {
    await client.connect();
    let filter = { date: req.body.timestamp };
    const cursor = client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .find(filter);

    resu = await cursor.toArray();
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
    var str = "";
    if (resu.length > 0) {
      str =
        '<br><table style="border: 1px solid white; "><tr><th style="border: 1px solid white; text-align: start;">Date</th><th style="border: 1px solid white; text-align: start;">Time</th><th style="border: 1px solid white; text-align: start;">Confirmed</th></tr> ';
      resu.forEach((val) => {
        var confirm = val.confirmed ? "Confirmed" : "Not Confirmed";
        str += `<tr><td style="border: 1px solid white;">${val.date}</td> <td style="border: 1px solid white;">${val.time}</td> <td style="border: 1px solid white;">${confirm}</td>`;
        str += ` </tr>`;
      });
      str += "</table>";
    } else {
      str = "This date is completely free!";
    }
    res.send([str]);
  }
});

app.get("/adminView", (req, res) => {
  res.sendFile(path.join(__dirname, "/html/adminView.html"));
});

app.post("/adminViewProcess", async (req, res) => {
  let resu;
  try {
    await client.connect();
    let filter = {};
    const cursor = client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .find(filter);

    resu = await cursor.toArray();
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
    var templateString = fs.readFileSync("html/adminViewProcess.ejs", "utf-8");
    var str =
      '<table style="border: 1px solid white; "><tr><th style="border: 1px solid white; text-align: start;">Name</th><th style="border: 1px solid white; text-align: start;">Email</th><th style="border: 1px solid white; text-align: start;">Date</th><th style="border: 1px solid white; text-align: start;">Time</th><th style="border: 1px solid white; text-align: start;">Information</th><th style="border: 1px solid white; text-align: start;">Confirmed</th><th style="border: 1px solid white; text-align: start;">Action</th></tr> ';
    resu.forEach((val) => {
      var confirm = val.confirmed ? "Confirmed" : "Not Confirmed";
      str += `<tr><td style="border: 1px solid white;">${val.name}</td> <td style="border: 1px solid white;">${val.email}</td> <td style="border: 1px solid white;">${val.date}</td> <td style="border: 1px solid white;">${val.time}</td> <td style="border: 1px solid white;">${val.info}</td><td style="border: 1px solid white;">${confirm}</td>`;
      str += `<td style="border: 1px solid white;"><button onclick="confirm('${val.id}')">Confirm/Cancel</button></td> </tr>`;
    });
    str += "</table>";
    res.end(
      ejs.render(templateString, {
        itemsTable: str,
      })
    );
  }
});

app.post("/changeMeeting/:id", async (req, res) => {
  try {
    await client.connect();

    let filter = { id: req.params.id };
    let update = [{ $set: { confirmed: { $not: "$confirmed" } } }];

    const result = await client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .updateOne(filter, update);
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
    res.status(200).end();
  }
});

app.get("/adminRemove", (req, res) => {
  res.sendFile(path.join(__dirname, "/html/adminRemove.html"));
});

app.post("/processAdminRemove", async (req, res) => {
  let resu = 0;
  try {
    await client.connect();
    let filter = {};
    const cursor = client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .find(filter);

    const result = await cursor.toArray();
    resu = result.length;
    await client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .deleteMany({});
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
    var templateString = fs.readFileSync("html/removed.ejs", "utf-8");
    res.end(ejs.render(templateString, { reason: resu }));
  }
});

const express = require('express');
const path = require('path');
const dotenv = require("dotenv");
const port=3030
/* 2. Create a new Express application */
const app = express();
/* 3. Create a route at ROOT: / */
const router = express.Router();
app.use(router)
dotenv.config();

router.use(express.json());
router.use(express.urlencoded({ extended: true }));

router.get('/', (req, res) => {
    console.log('Request at /');
    res.sendFile(path.join(`${__dirname}/html/search.html`))

})

const mysql = require('mysql2');
var connection = mysql.createConnection({
    host : process.env.MYSQL_HOST,
    user : process.env.MYSQL_USERNAME,
    password : process.env.MYSQL_PASSWORD,
    database : process.env.MYSQL_DATABASE
});

router.post("/form-submit",function(req,res){
    var sql
    const search_choice = req.body.search_choice;
    const search_value = req.body.search_value;
    
    if (search_choice == 'ID'){
        console.log('Search by ID with the value ' + search_value);
        sql = `SELECT * FROM professor 
        Where EMP_NUM = ${search_value}` 
    }

    else if (search_choice == 'name'){
        console.log('Search by name with the value ' + search_value);
        sql = `SELECT * FROM professor Where EMP_FNAME = '${search_value}'` 
    }

    connection.query( sql, function (error, results) {
        if (error) throw error;
        console.log(`${results.length} rows returned`);
        if(results.length == 0){
           return res.sendFile(path.join(`${__dirname}/html/notfound.html`))
        }else{
           return res.send(results); 
        }
            
        
    });
});

connection.connect(function(err){
    if(err) throw err;
        console.log(`Connected DB: ${process.env.MYSQL_DATABASE}`);
    });

app.listen(process.env.port, function() { 
    console.log(`Server listening on port: ${process.env.port}`)});
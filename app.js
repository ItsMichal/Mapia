var express = require('express');
var app = express();
var bp = require('body-parser');
var fs = require('fs');
var path = require('path');
var http = require('http').Server(app);
var xlsx = require('node-xlsx');
const readline = require('readline');
const util = require('util');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var answering = false;



var gameTree = {
  "continent": {
    "response":"What continent would you like to be quized on? Say all for all questions. ",
    "listPrefix":"The continents are: ",
    "error":"Sorry, I didn't get what you said. Please try saying the name of the continent exactly. "
  },
  "region": {
    "response":"What region would you like to be quized on? Say all for all regions. ",
    "listPrefix":"The regions are: ",
    "error":"Sorry, I didn't get what you said. Please try saying the name of the region exactly. "
  },
  "country":{
    "response":"What country would you like to be quized on? Say all for all countries. ",
    "listPrefix":"The countries are: ",
    "error":"Sorry, I didn't get what you said. Please try saying the name of the country exactly. "
  },
  "position":0,
  "confirm":"Alright, you are set! Get ready! ",

  "target":{
    "continent":undefined,
    "region":undefined,
    "country":undefined
  },

  "config":{
    "lives":3,
    "correct": "Correct! Next question: ",
    "incorrect": "Incorrect! Try again! Lives Left: ",
    "reset": "Resetting. Say something to restart! "
  },

  "indexes":{
    "mapindex":-1,
    "regindex":-1,
    "conindex":-1,
    "qindex":-1
  }
}

var o_gameTree = JSON.parse(JSON.stringify(gameTree));

var work = xlsx.parse(`${__dirname}/test.xlsx`)

var map = {};

console.log(work[0].data);
//increment thru xlsx by row
for(var i = 1; i < work[0].data.length; i++){
  //console.log(continent);
  //console.log(typeof continent);

  var isRowFilled = (typeof work[0].data[i][0] !== "string" || work[0].data[i][0] == "" || work[0].data[i][0] == " ");
  isRowFilled = isRowFilled || (typeof work[0].data[i][1] !== "string" || work[0].data[i][1] == "" || work[0].data[i][1] == " ");
  isRowFilled = isRowFilled || (typeof work[0].data[i][2] !== "string" || work[0].data[i][2] == "" || work[0].data[i][2] == " ");
  isRowFilled = isRowFilled || (typeof work[0].data[i][3] !== "string" || work[0].data[i][3] == "" || work[0].data[i][3] == " ");
  isRowFilled = isRowFilled || (typeof work[0].data[i][4] !== "string" || work[0].data[i][4] == "" || work[0].data[i][4] == " ");

  if(!isRowFilled){
    var continent = (work[0].data[i][0]).toLowerCase();
    var region = (work[0].data[i][1]).toLowerCase();
    var country = (work[0].data[i][2]).toLowerCase();
    var jordon = (work[0].data[i][3]).toLowerCase();
    var hope = (work[0].data[i][4]).toLowerCase();


    //if continent not found in our JSON map
    if(!(continent in map)){
      //Push the continent,region,and country to our JSON map
      map[continent] = {};
      map[continent][region] = {};
      map[continent][region][country] = {"Question": [ (jordon) ], "Answer": [ (hope) ]};

      //TODO: ADD Q&A DATA
    }else{
      //Get index of region
      //var indx1 = map.indexOfcontinent;

      //Check if region is already in the map
      if(!(region in map[continent] )){
        //if not, lets create a reference to region and country (and add Q&A data)
        map[continent][region] = {};
        map[continent][region][country] = {"Question": [ (jordon) ], "Answer": [ (hope) ]};
      }else{
        //if yes, lets see if country is in map
        if(!(country in map[continent][region])){
          //if yes, lets add the country to the map (along with Q&A data)
          map[continent][region][country] = {"Question": [ (jordon) ], "Answer": [ (hope) ]};
        }else{
          //if yes, lets just add the Q&A data
          map[continent][region][country]["Question"].push(jordon);
          map[continent][(region)][country]["Answer"].push(hope);
        }
      }
    }
  }
}

console.log(util.inspect(map, false, null))



//Port setup for hosting platform. Should be 8080 not 5000 by convention but who cares eh
app.set('port', (process.env.PORT || 5000));

//Sets up express to use json interpreter so I can parse the incoming json request from API.AI
app.use(bp.json());

//Probably unneccessary but convention (and ctrl+c / ctrl+v from debugging heroku.com)
app.use(express.static(__dirname + '/public'));


//You can delete this, its pretty unneccessary.
app.get('/', function(rq, rs){
  rs.send('/app.html');
});

app.post('/webhook', function(rq, rs){
  rs.set('Content-Type', 'application/json');
  var response = cmdtest(rq.body.result.resolvedQuery);
  rs.send({"speech":response, "displayText":response});
});

rl.on('line', (input) => {
  cmdtest(input);
});

function cmdtest(rq){
  var req = rq;
  var res = "";
  if(typeof req !== undefined && req != ""){


    //Check if game is at default start
    if(gameTree.position == 0){
      //If game is start, give a valid response to indicate this
      res += gameTree.continent.response;
      res += gameTree.continent.listPrefix;
      for(var i in map){
        res+= i + ", ";
      }
      res = res.substring(0, res.length-2);
      gameTree.position++;



    }else if(gameTree.position == 1){

      //GET/PARSE "ALL"
      if(req.toLowerCase().indexOf("all") > -1){
        //Make sure game skips to after setup
        gameTree.position = 4;
        //Send a confirmation notice to user.
        res += gameTree.confirm;
      //END GET/PARSE ALL

      }else{
        //Otherwise, check for continent match

        //GET/PARSE CONTINENT
        var answer;
        var words = req.toLowerCase().split(" ");
        for(var i = 0; i < words.length; i++){
          if(map[words[i]] !== undefined){
            answer = words[i];
          }
        }
        //END GET/PARSE CONTINENT

        //IF NOT A THING
        if(answer === undefined){
          res+= gameTree.continent.error;
          res +=" "+ gameTree.continent.listPrefix;
          for(var i in map){
            res+= i + ", ";
          }
          res = res.substring(0, res.length-2);

        //IF A THING
        }else{
          gameTree.target.continent= answer;
          res += gameTree.region.response;
          res += gameTree.region.listPrefix;
          for(var i in map[answer]){
            res+= i + ", ";
          }
          res = res.substring(0, res.length-2);
          gameTree.position++;
        }
      }
    //-----------
    //REGION PART
    //-----------
    }else if(gameTree.position == 2){
      if(req.toLowerCase().indexOf("all") > -1){
        //Make sure game skips to after setup
        gameTree.position = 4;
        //Send a confirmation notice to user.
        res += gameTree.confirm;
      //END GET/PARSE ALL

      }else{
        //Otherwise, check for continent match

        //GET/PARSE CONTINENT
        var answer;
        var words = req.toLowerCase().split(" ");
        console.log(gameTree.target.continent);
        for(var i = 0; i < words.length; i++){
          if(map[gameTree.target.continent][words[i]] !== undefined){
            answer = words[i];
          }
        }
        //END GET/PARSE CONTINENT

        //IF NOT A THING
        if(answer === undefined){
          res+= gameTree.region.error;
          res +=" "+ gameTree.region.listPrefix;
          for(var i in map[gameTree.target.continent]){
            res+= i + ", ";
          }
          res = res.substring(0, res.length-2);

        //IF A THING
        }else{
          gameTree.target.region = answer;
          res += gameTree.country.response;
          res += gameTree.country.listPrefix;
          for(var i in map[gameTree.target.continent][answer]){
            res+= i + ", ";
          }
          res = res.substring(0, res.length-2);
          gameTree.position++;
        }
      }
    }else if(gameTree.position == 3){
      if(req.toLowerCase().indexOf("all") > -1){
        //Make sure game skips to after setup
        gameTree.position = 4;
        //Send a confirmation notice to user.
        res += gameTree.confirm;
      //END GET/PARSE ALL

      }else{
        //Otherwise, check for continent match

        //GET/PARSE CONTINENT
        var answer;
        if(map[gameTree.target.continent][gameTree.target.region][req.toLowerCase()] !== undefined){
            answer = req.toLowerCase();
        }
        //END GET/PARSE CONTINENT

        //IF NOT A THING
        if(answer === undefined){
          res+= gameTree.country.error;
          res +=" "+ gameTree.country.listPrefix;
          for(var i in map[gameTree.target.continent][gameTree.target.region]){
            res+= i + ", ";
          }
          res = res.substring(0, res.length-2);

        //IF A THING
        }else{
          gameTree.target.country = answer;
          res += gameTree.confirm;
          gameTree.position++;
        }
      }
    }


    //TODO: change to a way where repeat questions can't happen
    //TODO: change responses for correct to incorrect to be defined up top
    //TODO: implement lives system. maybe hints?
    //TODO: Make a better reset system lmao
    if(gameTree.position == 4){
      res += getQuestion();
      gameTree.position++;
    }else if(gameTree.position == 5){
      if(req.indexOf("reset") > -1){
        gameTree = JSON.parse(JSON.stringify(o_gameTree));
        res+=gameTree.config.reset;

      }else if(gameTree.target.continent === undefined){
        var answer = map[gameTree.indexes.mapindex][gameTree.indexes.regindex][gameTree.indexes.conindex]["Answer"][gameTree.indexes.qindex];
        if(is_match(answer, req)){
          res += gameTree.config.correct;
          res += getQuestion();
          //gameTree.position--;
        }else{
          gameTree.config.lives--;
          res+=gameTree.config.incorrect + gameTree.config.lives;
        }
      }else{
        if(gameTree.target.region === undefined){
          var answer = map[gameTree.target.continent][gameTree.indexes.regindex][gameTree.indexes.conindex]["Answer"][gameTree.indexes.qindex];
          if(is_match(answer, req)){
            res += gameTree.config.correct;
            res += getQuestion();
            //gameTree.position--;
          }else{
            gameTree.config.lives--;
            res+=gameTree.config.incorrect + gameTree.config.lives;
          }
        }else{
          if(gameTree.target.country === undefined){
            var answer = map[gameTree.target.continent][gameTree.target.region][gameTree.indexes.conindex]["Answer"][gameTree.indexes.qindex];
            if(is_match(answer, req)){
              res+=gameTree.config.correct;
              res += getQuestion();
              //gameTree.position--;
            }else{
              gameTree.config.lives--;
              res+=gameTree.config.incorrect + gameTree.config.lives;
            }
          }else{
            var answer = map[gameTree.target.continent][gameTree.target.region][gameTree.target.country]["Answer"][gameTree.indexes.qindex];
            if(is_match(answer, req)){
              res += gameTree.config.correct;
              res += getQuestion();
              //gameTree.position--;
            }else{
              gameTree.config.lives--;
              res+= gameTree.config.incorrect + gameTree.config.lives;
            }
          }
        }
      }
    }

  }

  console.log(res);
  return(res);
}

function is_match(real,user){
  //TODO: Multiple answers
  var isMatch = false;
  var user_f = user.replace(/\s+/g, '').toLowerCase();
  var real_f = real.replace(/\s+/g, '').toLowerCase();
  console.log(user_f);
  console.log(real_f);

  var ranswers = real_f.toLowerCase().split("/");
  console.log(ranswers);
  for(var i = 0; i < ranswers.length; i++){
    if(user_f.indexOf(ranswers[i]) > -1){
      isMatch = true;
    }
  }

  return isMatch;
}

function getQuestion(){
  var res = "";
  //Get question
  if(gameTree.target.continent === undefined){
    //TODO: Pick a random question from everything
    gameTree.indexes.mapindex = Object.keys(map)[Math.floor((Object.keys(map).length) * Math.random())];
    var regions = map[gameTree.indexes.mapindex];
    gameTree.indexes.regindex = Object.keys(regions)[Math.floor((Object.keys(regions).length) * Math.random())];
    var countries = map[gameTree.indexes.mapindex][gameTree.indexes.regindex];
    gameTree.indexes.conindex = Object.keys(countries)[Math.floor((Object.keys(countries).length) * Math.random())];
    var questions = map[gameTree.indexes.mapindex][gameTree.indexes.regindex][gameTree.indexes.conindex]["Question"];
    gameTree.indexes.qindex = Math.floor(questions.length * Math.random());
    res+=questions[gameTree.indexes.qindex];
  }else{
    if(gameTree.target.region === undefined){
      //TODO: Pick a random question from continent
      var regions = map[gameTree.target.continent];
      gameTree.indexes.regindex = Object.keys(regions)[Math.floor((Object.keys(regions).length) * Math.random())];
      var countries = map[gameTree.target.continent][gameTree.indexes.regindex];
      gameTree.indexes.conindex = Object.keys(countries)[Math.floor((Object.keys(countries).length) * Math.random())];
      var questions = map[gameTree.target.continent][gameTree.indexes.regindex][gameTree.indexes.conindex]["Question"];
      gameTree.indexes.qindex = Math.floor(questions.length * Math.random());
      res+=questions[gameTree.indexes.qindex];
    }else{
      if(gameTree.target.country === undefined){
        //TODO: Pick a random question from region
        var countries = map[gameTree.target.continent][gameTree.target.region];
        gameTree.indexes.conindex = Object.keys(countries)[Math.floor((Object.keys(countries).length) * Math.random())];
        var questions = map[gameTree.target.continent][gameTree.target.region][gameTree.indexes.conindex]["Question"];
        gameTree.indexes.qindex = Math.floor(questions.length * Math.random());
        res+=questions[gameTree.indexes.qindex];

      }else{
        //Pick a random question
        var questions = map[gameTree.target.continent][gameTree.target.region][gameTree.target.country]["Question"];
        gameTree.indexes.qindex = Math.floor(questions.length * Math.random());
        res+=questions[gameTree.indexes.qindex];
      }
    }
  }
  return res;
}

http.listen(app.get('port'), function() {
  console.log('Mapia Running...');
});

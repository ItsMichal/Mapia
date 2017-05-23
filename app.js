var express = require('express');
var app = express();
var bp = require('body-parser');
var fs = require('fs');
var path = require('path');
var http = require('http').Server(app);
var xlsx = require('node-xlsx');
var io = require('socket.io')(http);
const readline = require('readline');
const util = require('util');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

var answering = false;

var highScore = 0;

var gameTree = {
  "game":{
    "setup":{
      "response":"Hello! Welcome to Mapia. ",
      "listPrefix":"Please choose a gamemode from the following: ",
      "error":"Sorry, I didn't get what you said. Please try saying the name of the game mode exactly. "
    },
    "gameMode":0,
    "gameModes": ["travel", "trivia"],

    "traveltheworld":{
      "lost": "You lost!"
    }
  },

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
  "position":-1,
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

var answeree;
var questionee;

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
      map[continent][region][country] = {"Question": [ (jordon) ], "Answer": [ (hope) ], "Used":[]};
      map[continent][region][country]["Used"].push(0);


    }else{
      //Get index of region
      //var indx1 = map.indexOfcontinent;

      //Check if region is already in the map
      if(!(region in map[continent] )){
        //if not, lets create a reference to region and country (and add Q&A data)
        map[continent][region] = {};
        map[continent][region][country] = {"Question": [ (jordon) ], "Answer": [ (hope) ],"Used":[]};
        map[continent][region][country]["Used"].push(0);
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


//last output
var lastres = "";

//Port setup for hosting platform. Should be 8080 not 5000 by convention but who cares eh
app.set('port', (process.env.PORT || 5000));

//Sets up express to use json interpreter so I can parse the incoming json request from API.AI
app.use(bp.json());

//Probably unneccessary but convention (and ctrl+c / ctrl+v from debugging heroku.com)
app.use(express.static(__dirname + '/public'));


//You can delete this, its pretty unneccessary.
app.get('/', function(rq, rs){
  rs.sendFile(path.join(__dirname + '/app.html'));
});

app.post('/webhook', function(rq, rs){
  rs.set('Content-Type', 'application/json');
  var response = cmdtest(rq.body.result.resolvedQuery);
  rs.send({"speech":response, "displayText":response});
});

app.get('/json', function(rq,rs){
  rs.set('Content-Type', 'application/json');
  rs.send(gameTree);
});

rl.on('line', (input) => {
  console.log(cmdtest(input));
});

io.on('connection', function(socket){

  if(gameTree.position > 4){
  //console.log(res);
  //console.log(answer);
  console.log(answeree);
  //console.log((gameTree.target.region === undefined));
  var resp = {
    "target":{
      "continent": (gameTree.target.continent === undefined && gameTree.position > 4) ? gameTree.indexes.mapindex : gameTree.target.continent,
      "region": (gameTree.target.region === undefined && gameTree.position > 4) ? gameTree.indexes.regindex : gameTree.target.region,
      "country": (gameTree.target.country === undefined && gameTree.position > 4) ? gameTree.indexes.conindex : gameTree.target.country
    },
    "question": questionee,
    "answer": answeree
  }
  console.log(Object.keys(map));
  console.log(gameTree.indexes.mapindex);
  io.emit('update', resp);

}else{
    var resp = {
      "target":{
        "continent": "",
        "region": "",
        "country": ""
      },
      "question": (lastres == "" || lastres === undefined) ? "Say Something To Start!" : lastres,
      "answer": ""
    }
    io.emit('update', resp);
  }

  socket.on('query',function(m){

    cmdtest(m);
    if(gameTree.position < 5){
    var resp = {
      "target":{
        "continent": "",
        "region": "",
        "country": ""
      },
      "question": (lastres == "" || lastres === undefined) ? "Say Something To Start!" : lastres,
      "answer": ""
    }
    io.emit('update', resp);
  }

  });




}
);

function cmdtest(rq){
  var req = rq;
  var res = "";
  if(typeof req !== undefined && req != ""){
    //TODO: change this so it starts at zero lmao
    if(gameTree.position == -1){
      res+= gameTree.game.setup.response;
      res+= gameTree.game.setup.listPrefix;
      for(var i in gameTree.game.gameModes){
        res+= gameTree.game.gameModes[i] +", ";

      }

      res = res.substring(0, res.length-2);

      gameTree.position++;
    }
    //Check if game is at default start
    else if(gameTree.position == 0){
      var answer;
      var words = req.toLowerCase().split(" ");
      for(var i = 0; i < words.length; i++){
        for(var j = 0; j < gameTree.game.gameModes.length; j++){
          console.log(gameTree.game.gameModes[j].replace(/\s+/g, '') + " " + words[i].replace(/\s+/g, ''));
          if(gameTree.game.gameModes[j].replace(/\s+/g, '') == words[i].replace(/\s+/g, '')){
            answer = j;
          }
        }
      }
      if(answer === undefined){
        res+= gameTree.game.setup.error;
        res +=" "+ gameTree.game.setup.listPrefix;
        for(var i in gameTree.game.gameModes){
          res+= gameTree.game.gameModes[i] + ", ";
        }
        res = res.substring(0, res.length-2);
      }else

      {
        console.log(answer);
        gameTree.game.gameMode = answer;
        if(gameTree.game.gameMode == 0){
          gameTree.position = 4;
          res+= gameTree.confirm;
        }else if(gameTree.game.gameMode == 1){
          //If game is start, give a valid response to indicate this
          res += gameTree.continent.response;
          res += gameTree.continent.listPrefix;
          for(var i in map){
            res+= i + ", ";
          }
          res = res.substring(0, res.length-2);
          gameTree.position++;
        }
      }
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
    //TODO: add help command?

    //NOW ONLY LAUNCHES ON Gamemode 1
    if(gameTree.position == 4 && gameTree.game.gameMode == 1){
      questionee = getRandomQuestion(); res += questionee;
      gameTree.position++;
    }else if(gameTree.position == 5){
      if(req.indexOf("reset") > -1){
        gameTree = JSON.parse(JSON.stringify(o_gameTree));
        res+=gameTree.config.reset;

      }else if(gameTree.target.continent === undefined){
        answeree = map[gameTree.indexes.mapindex][gameTree.indexes.regindex][gameTree.indexes.conindex]["Answer"][gameTree.indexes.qindex];
        console.log(answeree)
        if(is_match(answeree, req)){
          res += gameTree.config.correct;
          questionee = getRandomQuestion(); res += questionee;
          //gameTree.position--;
        }else{
          gameTree.config.lives--;
          res+=gameTree.config.incorrect;
        }
      }else{
        if(gameTree.target.region === undefined){
          answeree = map[gameTree.target.continent][gameTree.indexes.regindex][gameTree.indexes.conindex]["Answer"][gameTree.indexes.qindex];
          if(is_match(answeree, req)){
            res += gameTree.config.correct;
            questionee = getRandomQuestion(); res += questionee;
            //gameTree.position--;
          }else{
            gameTree.config.lives--;
            res+=gameTree.config.incorrect;
          }
        }else{
          if(gameTree.target.country === undefined){
            answeree = map[gameTree.target.continent][gameTree.target.region][gameTree.indexes.conindex]["Answer"][gameTree.indexes.qindex];
            if(is_match(answeree, req)){
              res+=gameTree.config.correct;
              questionee = getRandomQuestion(); res += questionee;
              //gameTree.position--;
            }else{
              gameTree.config.lives--;
              res+=gameTree.config.incorrect;
            }
          }else{
            answeree = map[gameTree.target.continent][gameTree.target.region][gameTree.target.country]["Answer"][gameTree.indexes.qindex];
            if(is_match(answeree, req)){
              res += gameTree.config.correct;
              questionee = getRandomQuestion(); res += questionee;
              //gameTree.position--;
            }else{
              gameTree.config.lives--;
              res+= gameTree.config.incorrect
            }
          }
        }
      }
    }

    if(gameTree.position == 4 && gameTree.game.gameMode == 0){


      questionee = getRandomQuestion();
      res += questionee;
      gameTree.position++;
    }else if(gameTree.position == 5 && gameTree.game.gameMode == 0){

    }

  }

  if(gameTree.game.gameMode == 0 && gameTree.position == 5){
    if(gameTree.game.lives <= 0){
      gameTree = JSON.parse(JSON.stringify(o_gameTree));
      res+=gameTree.game.traveltheworld.lost;
    }else{
      res+=gameTree.config.lives;
    }
  }


  if(gameTree.position > 4 && answeree !== undefined){
  //console.log(res);
  //console.log(answer);
  console.log(answeree);
  //console.log((gameTree.target.region === undefined));
  var resp = {
    "target":{
      "continent": (gameTree.target.continent === undefined && gameTree.position > 4) ? gameTree.indexes.mapindex : gameTree.target.continent,
      "region": (gameTree.target.region === undefined && gameTree.position > 4) ? gameTree.indexes.regindex : gameTree.target.region,
      "country": (gameTree.target.country === undefined && gameTree.position > 4) ? gameTree.indexes.conindex : gameTree.target.country
    },
    "question": questionee,
    "answer": answeree
  }
  console.log(Object.keys(map));
  console.log(gameTree.indexes.mapindex);
  io.emit('update', resp);

  }
  lastres = res;
  return(res);
}

function is_match(real,user){
  //TODO: Multiple answers
  var isMatch = false;
  var user_f = user.toLowerCase();
  var real_f = real.toLowerCase();
  console.log(user_f);
  console.log(real_f);

  var ranswers = real_f.toLowerCase().split("/");

  var usr_splt = user_f.split(" ");
  var usr_nmrindx = []
  var hasNumberInAnswer = false;
  for(var i = 0; i < usr_splt.length; i++){
      usr_nmrindx.push(!isNaN(parseInt(usr_splt[i].replace(/\s+/g, ''))));
      if(!isNaN(parseInt(usr_splt[i].replace(/\s+/g, '')))){
        hasNumberInAnswer = true;
      }
  }

  console.log(ranswers);
  for(var i = 0; i < ranswers.length; i++){
    if(ranswers[i].indexOf("@") > -1){
      var splt = ranswers[i].split(" ");
      console.log("-valid loop start-")
      //parse through all the words in answer
      for(var j = 0; j < splt.length;  j++){

        var sanitiz = splt[j].replace(/\s+/g, '')

        console.log("sanitiz: " + sanitiz);
        //if in the word there is the range key
        if(splt[j].indexOf("@") > -1){
          //point of @
          var delimitIndex = sanitiz.indexOf("@");
          var numberOne = parseInt(sanitiz.substring(0, delimitIndex));
          var numberTwo = parseInt(sanitiz.substring(delimitIndex+1, splt[j].length));
          console.log("number one: " + numberOne);
          console.log("number two: " + numberTwo);
          //make sure stuff is correct
          if(!isNaN(numberOne) && !isNaN(numberTwo)){
            //check through usr
            for(var h= 0; h < usr_splt.length; h++){
              //if word is number in response
              if(usr_nmrindx[h]){
                //parse the number
                var usernum= parseInt(usr_splt[h].replace(/\s+/g, ''));
                console.log("Usernum: "+usernum);
                //check if in range
                if(usernum >= numberOne && usernum <= numberTwo){
                  console.log(usernum + "in Range!");
                  //if in range, change correct answer
                  splt[j] = usr_splt[h].replace(/\s+/g, '');
                  //set thing to false for multiples
                  usr_nmrindx[h]=false;
                  //end the for loop
                  h = usr_splt.length
                }
              }
            }
          }
          console.log("-end loop-");
        }
      }
      ranswers[i] = "";
      for(var j = 0; j < splt.length; j++){
        ranswers[i] += splt[j];
      }
    }
    real_f = real.toLowerCase().replace(/\s+/g, '');
    console.log("-----");
    console.log(ranswers[i]);
    console.log(user_f);
    console.log(user_f.toLowerCase().replace(/\s+/g, '') + " okay")
    console.log("-----");
    if(user_f.toLowerCase().replace(/\s+/g, '').indexOf(ranswers[i].toLowerCase().replace(/\s+/g, '')) > -1){
      isMatch = true;
    }
  }

  return isMatch;
}

function getRandomQuestion(){
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
    answeree = map[gameTree.indexes.mapindex][gameTree.indexes.regindex][gameTree.indexes.conindex]["Answer"][gameTree.indexes.qindex];
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
      answeree = map[gameTree.target.continent][gameTree.indexes.regindex][gameTree.indexes.conindex]["Answer"][gameTree.indexes.qindex];

    }else{
      if(gameTree.target.country === undefined){
        //TODO: Pick a random question from region
        var countries = map[gameTree.target.continent][gameTree.target.region];
        gameTree.indexes.conindex = Object.keys(countries)[Math.floor((Object.keys(countries).length) * Math.random())];
        var questions = map[gameTree.target.continent][gameTree.target.region][gameTree.indexes.conindex]["Question"];
        gameTree.indexes.qindex = Math.floor(questions.length * Math.random());
        res+=questions[gameTree.indexes.qindex];
        answeree = map[gameTree.target.continent][gameTree.target.region][gameTree.indexes.conindex]["Answer"][gameTree.indexes.qindex];
      }else{
        //Pick a random question
        var questions = map[gameTree.target.continent][gameTree.target.region][gameTree.target.country]["Question"];
        gameTree.indexes.qindex = Math.floor(questions.length * Math.random());
        res+=questions[gameTree.indexes.qindex];
        answeree = map[gameTree.target.continent][gameTree.target.region][gameTree.target.country]["Answer"][gameTree.indexes.qindex];
      }
    }
  }
  return res;
}

http.listen(app.get('port'), function() {
  console.log('Mapia Running...');
});

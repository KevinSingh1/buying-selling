var express = require('express')
var app = express()
app.enable('trust proxy');
app.use((req,res,next)=>{
  if(req.protocol=='https'){
    next();
  }else{
    res.redirect(`https://${req.hostname}`);
  }
})
const path=require('path');
app.use(express.static(path.join(__dirname,"../build")));

app.get("/",(req,res,next)=>{
    res.sendFile(path.join(__dirname,"../build","index.html"));
  })

app.set("view engine", "ejs")

const mongoose = require('mongoose');
mongoose.connect('mongodb://localhost:27017/chats', { useNewUrlParser: true });
const Schema = mongoose.Schema;
const ObjectId = Schema.ObjectId;

var session = require('express-session')
app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 1160000 } }))

const _ = require("lodash")

var bodyParser = require("body-parser")
var urlencodedParser = bodyParser.urlencoded({ extended: false })


const adScehma = new Schema({
    name: String,
    postedBy: ObjectId
});

const adModel = mongoose.model("Ad", adScehma)

const userScehma = new Schema({
    email: String,
    password: String
});

const userModel = mongoose.model("User", userScehma)

const messageSchema = new Schema({
    buyerId: ObjectId,
    sellerId: ObjectId,
    from:String,
    message: String,
    adId:ObjectId
})

const messageModel = mongoose.model("Message", messageSchema)

app.get('/', (req, res) => {
    adModel.find({}, (err, docs) => {
        res.render('index', { user: req.session.user, ads: docs })
    })
})

const checkLogIn = (req, res, next) => {
    if (req.session.user) {
        next();
    } else {
        res.redirect('/')
    }
}

//Ad Routes
app.get('/ad/:id', (req, res) => {
    adModel.findById(req.params.id, (err,doc) => {
        if(req.session.user){
            messageModel.find({
                    buyerId: req.session.user._id,
                    adId:req.params.id
                },(err2,docs2) => {
                    res.render("ad", { 
                        user: req.session.user, ad: doc, messages: docs2 
                    })
                })
        }else{
            res.render("ad", { 
                user: req.session.user, ad: doc
            })
        }
    })  
})

//saving user message
app.post("/ad/:id",urlencodedParser,(req,res) => {
    let newMessage = new messageModel()
    newMessage.buyerId = req.session.user._id
    newMessage.message = req.body.msg
    newMessage.adId = req.params.id
    newMessage.from = "buyer"
    adModel.findOne({_id: req.params.id}, (err,doc) =>{
        newMessage.sellerId = doc.postedBy
        newMessage.save((err) => {
            res.redirect("/ad/" + req.params.id)
        })
    })
})

//User Routes

app.get('/user/login', (req, res) => {
    res.render('login')
})

app.get('/user/guideline', (req, res) => {
    res.render('guideline')
})
app.get('/user/contact', (req, res) => {
    res.render('contact')
})
app.post('/user/login', urlencodedParser, (req, res) => {
    switch (req.body.action) {
        case 'signup':
            userModel.findOne({ email: req.body.email }, function (err, doc) {
                if (err) {
                    console.log(err, 'error')
                    res.redirect('/')
                    return
                }
                if (_.isEmpty(doc)) {
                    let newUser = new userModel();
                    newUser.email = req.body.email;
                    newUser.password = req.body.password;
                    newUser.save(function (err) {
                        if (err) {
                            console.log(err, 'error')
                            return
                        }
                        res.render('login', { message: "Sign Up Successful. Please log in." })
                    });

                } else {
                    res.render('login', { message: "User already exists" })
                }
            })
            break;
        case 'login':
            userModel.findOne({ email: req.body.email, password: req.body.password }, function (err, doc) {
                if (err) {
                    console.log(err, 'error')
                    res.redirect('/')
                    return
                }
                if (_.isEmpty(doc)) {
                    res.render('login', { message: "Please check email/password" })
                } else {
                    req.session.user = doc
                    res.redirect('/user/dashboard')
                }
            })
            break;
    }

})

app.get('/user/dashboard', checkLogIn, (req, res) => {
    adModel.find({ postedBy: req.session.user._id }, (err, docs) => {
        res.render('user', { user: req.session.user, ads: docs })
    })
})

app.post('/user/dashboard', urlencodedParser, checkLogIn, (req, res) => {
    let newAd = new adModel()
    newAd.name = req.body.name
    newAd.postedBy = req.session.user._id
    newAd.save(function (err) {
        res.redirect("/user/dashboard")
    })
})

app.get("/user/ad/:id/chats", (req,res) => {
    messageModel.find({adId: req.params.id}, (err, docs) => {
        docs = _.groupBy(docs, "buyerId")
        docs = _.map(docs, (value,index) => { return value })
        res.render("chats", {chats: docs})
    })
})

app.post("/user/ad/:id/chats", urlencodedParser, (req,res) => {
    let newMessage = new messageModel()
    newMessage.buyerId = req.body.buyerid
    newMessage.message = req.body.message
    newMessage.adId = req.params.id
    newMessage.from = "seller"
    adModel.findOne({_id: req.params.id}, (err,doc) =>{
        newMessage.sellerId = doc.postedBy
        newMessage.save((err) => {
            console.log(newMessage)
            res.redirect("/user/ad/" + req.params.id + "/chats")
        })
    })
})



app.get('/user/logout', checkLogIn, (req, res) => {
    req.session.destroy()
    res.redirect('/')
})

app.use((req,res)=>{
    res.send("404,not found");
  })
  
// app.listen(3000, () => {
//     console.log("Server is running")
// })

server.listen(process.env.PORT||3000,(req,res)=>{
    console.log("Server is Listening ");
  })
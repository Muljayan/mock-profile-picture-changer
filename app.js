const express = require('express'),
    exphbs = require('express-handlebars'),
    bodyParser = require('body-parser'),
    path = require('path'),
    crypto = require('crypto'),
    mongoose = require('mongoose'),
    multer = require('multer'),
    GridFsStorage = require('multer-gridfs-storage'),
    Grid = require('gridfs-stream'),
    methodOverride = require('method-override'),
    objectId = mongoose.Types.ObjectId


const app = express();

//body-parser Middleware
app.use(bodyParser.json());

//method-override Middleware
app.use(methodOverride('X-HTTP-Method-Override'));
app.use(methodOverride('_method'));

//handlebars Middleware
app.engine('handlebars', exphbs({ defaultLayout: 'main' }));
app.set('view engine', 'handlebars');

//Mongo URI
const mongoURI = 'mongodb://localhost/profilepic';

//Create Mongo connection
const conn = mongoose.createConnection(mongoURI);

//init gfs
let gfs;

conn.once('open', function () {
    //Init Stream
    gfs = Grid(conn.db, mongoose.mongo);
    gfs.collection('uploads')

});

//Create Storage engine

const storage = new GridFsStorage({
    url: mongoURI,
    file: (req, file) => {
        console.log(file);
        const filename = file.originalname;
        const fileInfo = {
            filename: filename,
            bucketName: 'uploads',//should be same as gfs.collection

        };
        file.user = 'Some User' //set user
        return fileInfo;
    }
})

const upload = multer({
    storage,
    //Filter file extensions
    fileFilter: (req, file, callback) => {
        let ext = (path.extname(file.originalname)).toString();
        if (ext !== '.png' && ext !== '.jpg' && ext !== '.JPG' && ext !== '.jpeg') {

            return callback(new Error('Please select an image with .png, .jpeg or .jpg extensions'))
        }
        callback(null, true)
    }
});

//GET '/' route
app.get('/', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        //Check if files 
        if (!files || files.length === 0) {
            res.render('home', { files: false });
        } else {
            res.render('home', { files: files });
        }
    })
});

// //POST/upload route
// //uploads file to DB
app.post('/upload', upload.single('file'), (req, res) => {
    //Query all images in db
    gfs.files.find().toArray((err, files) => {
        //loop through each file         
        files.forEach((file) => {
            //stringify
            let fileID = (file._id).toString();
            let reqFileID = (req.file.id).toString();

            //compare both fileID and reqFileID
            if (fileID === reqFileID) {
                console.log('Matches')
            } else {
                //if it doesnt match remove
                console.log('Doesnt match')
                gfs.remove({ _id: fileID, root: 'uploads' }, (err, gridStore) => {
                });
            }
        })
    })

    res.json({ file: req.file });
});

//GET /files
//Display all files as JSON
app.get('/files', (req, res) => {
    gfs.files.find().toArray((err, files) => {
        //Check if files exist
        if (!files || files.length === 0) {
            return res.status(404).json({
                err: 'No files exist'
            })
        }
        //files exist
        return res.json(files);
    })
});

//GET /files/:filename
//Display one file as JSON
app.get('/files/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        //Check if file exists
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: 'No files exist'
            })
        }
        //File exists
        return res.json(file);
    })

});

//GET /image/:filename
//Display image
app.get('/image/:filename', (req, res) => {
    gfs.files.findOne({ filename: req.params.filename }, (err, file) => {
        //Check if file exists
        if (!file || file.length === 0) {
            return res.status(404).json({
                err: 'No files exist'
            })
        }
        //Check if image
        if (file.contentType === 'image/jpeg' || file.contentType === 'image/png') {
            //Read output to browser
            const readstream = gfs.createReadStream(file.filename);
            readstream.pipe(res);
        } else {
            res.status(404).json({
                err: 'Not an image'
            })
        }
    })

});

//DELETE /files/:id
//Delete file
app.delete('/files/:id', (req, res) => {
    gfs.remove({ _id: req.params.id, root: 'uploads' }, (err, gridStore) => {
        if (err) {
            return res.status(404).json({ err: err })
        }
        res.redirect('/');
    });
})


const port = 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
})


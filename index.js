require('dotenv').config();
const express = require('express');
const app = express();
const cors = require('cors');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');

// Middleware
app.use(cors());
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
	useNewUrlParser: true,
	useUnifiedTopology: true
});

// Schemas & Models
const userSchema = new mongoose.Schema({
	username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
	userId: { type: String, required: true },
	description: String,
	duration: Number,
	date: Date
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

// Serve home page
app.get('/', (req, res) => {
	res.sendFile(__dirname + '/views/index.html');
});

// ------------------------------------------------------
// Create a new user
// POST /api/users
// ------------------------------------------------------
app.post('/api/users', async (req, res) => {
	try {
		const user = new User({ username: req.body.username });
		const savedUser = await user.save();
		res.json({ username: savedUser.username, _id: savedUser._id });
	} catch (err) {
		res.json({ error: err.message });
	}
});

// ------------------------------------------------------
// Get all users
// GET /api/users
// ------------------------------------------------------
app.get('/api/users', async (req, res) => {
	const users = await User.find({}, 'username _id');
	res.json(users);
});

// ------------------------------------------------------
// Add exercise
// POST /api/users/:_id/exercises
// ------------------------------------------------------
app.post('/api/users/:_id/exercises', async (req, res) => {
	try {
		const user = await User.findById(req.params._id);
		if (!user) return res.json({ error: 'User not found' });

		const { description, duration, date } = req.body;

		const exercise = new Exercise({
			userId: user._id,
			description,
			duration: parseInt(duration),
			date: date ? new Date(date) : new Date()
		});

		const savedExercise = await exercise.save();

		res.json({
			username: user.username,
			description: savedExercise.description,
			duration: savedExercise.duration,
			date: savedExercise.date.toDateString(),
			_id: user._id
		});
	} catch (err) {
		res.json({ error: err.message });
	}
});

// ------------------------------------------------------
// Get user exercise log
// GET /api/users/:_id/logs?[from][&to][&limit]
// ------------------------------------------------------
app.get('/api/users/:_id/logs', async (req, res) => {
	try {
		const user = await User.findById(req.params._id);
		if (!user) return res.json({ error: 'User not found' });

		let { from, to, limit } = req.query;

		// Build query
		let dateFilter = {};
		if (from) dateFilter['$gte'] = new Date(from);
		if (to) dateFilter['$lte'] = new Date(to);

		const filter = { userId: user._id };
		if (from || to) filter.date = dateFilter;

		const exercises = await Exercise.find(filter).limit(+limit || 0);

		const log = exercises.map((ex) => ({
			description: ex.description,
			duration: ex.duration,
			date: ex.date.toDateString()
		}));

		res.json({
			username: user.username,
			count: log.length,
			_id: user._id,
			log
		});
	} catch (err) {
		res.json({ error: err.message });
	}
});

// ------------------------------------------------------
const listener = app.listen(process.env.PORT || 3000, () => {
	console.log('Your app is listening on port ' + listener.address().port);
});

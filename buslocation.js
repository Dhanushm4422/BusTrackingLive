const mongoose = require('mongoose');

const busLocationSchema = new mongoose.Schema({
  id: Number,
  lat: Number,
  lng: Number,
  destination: [Number],
});

const BusLocation = mongoose.model('BusLocation', busLocationSchema);

module.exports = BusLocation;

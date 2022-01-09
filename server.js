var express = require('express');
var app = express();
app.use(express.static('dist/strava-stats'));
app.get('*', function (req, res, next) {
    res.sendFile('dist/strava-stats/index.html', { root: __dirname });

});
app.listen(8080);
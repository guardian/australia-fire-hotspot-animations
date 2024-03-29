if (typeof fetch !== 'function') {
    global.fetch = require('node-fetch-polyfill');
}
const D3Node = require('d3-node')
const canvasModule = require('canvas'); // supports node-canvas v1 & v2.x
const d3 = require('d3')
const fs = require('fs');
const moment = require('moment');
const d3n = new D3Node({ canvasModule }); // pass it node-canvas
const settings_json = require('./settings')

/*
change index in hal... as in hal[0] or hal[2]
0 = Mid north coast
1 = Sydney
2 = North and gold coast
3 = Brisbane
4 = South coast
*/

var thisone = 4
var settings = settings_json[thisone]
var interval1 = null;
var firstRun = true;
var currentDate = null;
var projection = null;
// fs.mkdirSync(settings_json[thisone]['feature']);

function makeMap(data, places, image) {

	var width = 860
	var ratio = settings.width / settings.height

	console.log("picWidth",settings.width, "picHeight",settings.height, "ratio", ratio)

	var height = width / ratio
	var margin = { top: 0, right: 0, bottom: 0, left: 0 }
	var active = d3.select(null);
	var parseDate = d3.timeParse("%Y-%m-%d %H%M");
	var formatDate = d3.timeFormat("%Y-%m-%d");

	// var ratio = settings.width / settings.height

	var colors = ['rgba(219, 0, 14, 0.6)', 'rgba(0, 0, 0, 0.6)'];				

	var gradient = d3.scaleLinear()
						.range(['rgba(219, 0, 14, 1)', 'rgba(0, 0, 0, 1)'])
						.domain([0,48])

	projection = d3.geoMercator()
	                .scale(1)
	                .translate([0,0])	

	projection.fitSize([width, width / ratio], settings.bbox); 

	// var imageObj = new canvasModule.Image

	// imageObj.src = `.data/satellite/${settings.image}`

	var canvas = d3n.createCanvas(width, height)                     

	var context = canvas.getContext("2d"); 	              

	// var filterPlaces = places.features.filter((d) => ( d.properties.scalerank));

	var path = d3.geoPath()
		    .projection(projection)
		    .context(context);

	var graticule = d3.geoGraticule();  	    

	var point1 = projection([151.20346,-33.86760])[0]

	var point2 = projection([151.21432,-33.86760])[0]

	var rCircle = (point2 - point1)

	function drawMap() {

        var nw = projection(settings.northWest)
        var se = projection(settings.southEast)    
        var sx = 0
        var sy = 0
        var sw = settings.width
        var sh = settings.height
        var dx = nw[0]
        var dy = nw[1]
        var dw = se[0] - nw[0]
        var dh = se[1] - nw[1]
        
        context.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);  

	 //    filterPlaces.forEach(function(d,i) {
		// 	context.beginPath();
		// 	context.save();
		// 	context.fillStyle="#767676";
		// 	// context.strokeStyle = 'white';
		// 	context.shadowColor="white";
		// 	context.shadowBlur=5;
		// 	// context.strokeText(d.properties.name,projection([d.properties.longitude,d.properties.latitude])[0],projection([d.properties.longitude,d.properties.latitude])[1]);
		// 	context.fillText(d.properties.name,projection([d.properties.longitude,d.properties.latitude])[0],projection([d.properties.longitude,d.properties.latitude])[1]);
		// 	context.font = "15px 'Guardian Text Sans Web' Arial";
		//     context.closePath();
		//     context.restore();

		// })

	}

	drawMap();
	

	data.forEach(function(d) {
		d.lat = +d.latitude;
		d.lon = +d.longitude;
		d.date = moment.utc(d.time, "YYYY-MM-DD HHmm")
	})

	data.sort((a, b) => a.date - b.date);

	var sortData = (sortBy) => data.sort((a, b) =>  d3.descending(a["sort_" + sortBy], b["sort_" + sortBy]))

	var getRadius = (d) => (d < 6) ? radius(6) : radius(d);

	function fillGradient(date1, date2) {
		
		var one_hour=1000*60*60;

		var date1_ms = date1.valueOf();

		var date2_ms = date2.valueOf();

		var difference_ms = date2_ms - date1_ms;

		var daysDiff = Math.round(difference_ms/one_hour)

		return gradient(Math.round(daysDiff))
	}


	// var loop = true;
	function updateCircles(dateUpto) {

		context.clearRect(0,0,width,height);

		drawMap()

		var uptoDate = parseDate(dateUpto);
		
		var filterData = data.filter((d) => d.date < dateUpto);

		filterData.forEach(function(d,i) {
			var circleColor = colors[1]
			context.beginPath();
			context.arc(projection([d.lon,d.lat])[0], projection([d.lon,d.lat])[1], rCircle, 0, 2 * Math.PI);
			context.fillStyle = fillGradient(d.date, dateUpto)
		    context.fill();
		    context.closePath();
		})

		var month = currentDate.local().format("MMM D")
		var time = currentDate.local().format("HH:mm")

		context.beginPath();
		context.font = "22px 'Guardian Text Sans Web' Arial";
		context.fillStyle="#000000";
		context.fillText(month,760,40);
		context.closePath();

		context.beginPath();
		context.font = "22px 'Guardian Text Sans Web' Arial";
		context.fillStyle="#000000";
		context.fillText(time,760,70);
		context.closePath();

		
	}

	var startDate = moment.utc(data[0].time, "YYYY-MM-DD HHmm")
	
	var endDate = moment.utc(data[data.length-1].time, "YYYY-MM-DD HHmm")
	var currentDate = moment.utc(data[0].time, "YYYY-MM-DD HHmm")
	
	var counter = 0;


	function loop() {
		console.log(currentDate.local().format("MMM D HH:mm"))
 		console.log(endDate.local().format("MMM D HH:mm"))

 		if (currentDate.isSameOrAfter(endDate)) {
			console.log("stop")
			// loop = false
		}

		else {
			updateCircles(currentDate);
			const out = fs.createWriteStream(`./${settings_json[thisone]['feature']}/${currentDate.local().format("M-D-HH")}.png`)
			canvas.pngStream().pipe(out);
			out.on('finish', () =>  { 
				console.log('The PNG file was created.')
				console.log(currentDate.local().format("MMM D HH:mm"))
				currentDate.add(1, 'hours'); 
				loop()
			})
			
			
		}

	}

	loop()

}


const mapData = d3.csvParse(fs.readFileSync(`./data/${settings.csv}`, 'UTF-8').toString())
const places = require('./data/places.json')

canvasModule.loadImage(`./data/satellite/${settings.image}`).then((image) => {
  	
  makeMap(mapData, places, image)	

})
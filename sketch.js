let MIN_CONNECTIONS;
let TURN_MAX;
let SEEKING_TURN_MAX;
let FORK_PROBABILITY;
let VOLTAGE_KEPT;
let INITIAL_VOLTAGE;

const THICKNESS_FACTOR = 0.5;

const NODE_ATTRACTIVE_RANGE_FACTOR = 3;
const NODE_HIT_RANGE_FACTOR = 1.5;
const NODE_RESISTANCE = 1;

const NODE_WIDTH = 20;
const NODE_HEIGHT = 30;

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 1350;

const LINE_THICKNESS = 10;
const DOT_THICKNESS = 15;

const background_color = {r:10,g:10,b:10};
const lightning_color = {r:0,g:255,b:0};
const darker_lightning_color = {r:0,g:200,b:0};
const text_color = {r:255,g:255,b:255};

const nodes = []

let mutable_nodes = [];

function setup() {
	fetch('tape.txt').then(r => r.text()).then(tape => {
		createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);

		TURN_MAX = PI/8;
		SEEKING_TURN_MAX = PI/16;
		MIN_CONNECTIONS = 5;
		FORK_PROBABILITY = 0.8;
		VOLTAGE_KEPT = 0.9;
		INITIAL_VOLTAGE = 70;

		loadNodes(tape);
		mutable_nodes = [...nodes];

		let top_left_connections = 0;
		let bottom_right_connections = 0;
		while(top_left_connections < MIN_CONNECTIONS || bottom_right_connections < MIN_CONNECTIONS) {
			background(background_color.r,background_color.g,background_color.b);
			top_left_connections = lightning({x: 0, y: 250, a: PI/4, v: INITIAL_VOLTAGE});
			top_left_connections = MIN_CONNECTIONS;
			bottom_right_connections = lightning({x: CANVAS_WIDTH, y: CANVAS_HEIGHT-400, a: 4.5*PI/4, v: INITIAL_VOLTAGE});
			bottom_right_connections = MIN_CONNECTIONS;
		}
		drawNodes();
	});
}

function loadNodes(tape) {

	const lines = tape.split('\r\n');
	const num_lines = lines.length;
	const line_length = lines[0].length;

	const NODES_WIDTH = CANVAS_WIDTH;
	const NODES_HEIGHT = CANVAS_HEIGHT;

	for (let line = 0; line < num_lines; line++) {
		for (let i = 0; i < line_length; i++) {
			const c = lines[line][i];
			const x =
				(NODES_WIDTH/line_length) * (i);
			const y =
				(NODES_HEIGHT/num_lines) * line;
			if (c == '_') {
			}
			else if (c == '@') {
				nodes.push({x: x, y: y});
			} else if (y < 1300) {
				nodes.push({x: x, y: y, c: c});
			}
		}
	}
}

function drawNodes() {
	stroke(lightning_color.r, lightning_color.g, lightning_color.b);
	for (const n of nodes) {

		if (n.c) {
			fill(lightning_color.r, lightning_color.g, lightning_color.b);
			// textAlign(LEFT, BOTTOM);
			textAlign(CENTER, CENTER);
			textFont('monospace');
			noStroke();
			textSize(30);
			text(n.c, n.x, n.y);
		} else {

			let alone = true;
			for (const m of nodes) {
				if (n != m) {
					if (distance(n.x, n.y, m.x, m.y) <= max(NODE_HEIGHT,NODE_WIDTH) && !m.c) {
						strokeWeight(LINE_THICKNESS);
						stroke(darker_lightning_color.r, darker_lightning_color.g, darker_lightning_color.b);
						line(n.x, n.y, m.x, m.y);
						stroke(lightning_color.r, lightning_color.g, lightning_color.b);
						const TEXT_THICKNESS = 5;
						line(n.x+TEXT_THICKNESS, n.y+TEXT_THICKNESS, m.x+TEXT_THICKNESS, m.y+TEXT_THICKNESS);
						alone = false;
					}
				}
			}
			if (alone) {
				strokeWeight(DOT_THICKNESS);
				point(n.x, n.y);
			}
		}
	}
}

function distance(x1, y1, x2, y2) {
	return sqrt((x1-x2)**2 + (y1-y2)**2);
}

function lightning(c) {

	let connections = 0;

	function lightning_inner(c) {

		if (c.v < 1) {
			return;
		}

		let new_v = random(c.v*VOLTAGE_KEPT, c.v) - 1;

		let seeking_components;

		let node = null;
		let closest_node_distance = 1000000;
		for (const n of mutable_nodes) {
			const distance_to_node = distance(c.x, c.y, n.x, n.y);
			if (distance_to_node < closest_node_distance) {
				node = n;
				closest_node_distance = distance_to_node;
			}
			
		}
		const distance_to_node = distance(c.x, c.y, node.x, node.y);
		if (distance_to_node < NODE_ATTRACTIVE_RANGE_FACTOR*new_v) {

			const angle_to_node = 
				atan2(node.y - c.y, node.x - c.x) +
				random(-SEEKING_TURN_MAX, SEEKING_TURN_MAX);
			c.a = angle_to_node;

			if(distance_to_node < NODE_HIT_RANGE_FACTOR*new_v) {
				seeking_components = {
					x:node.x - c.x,
					y: node.y - c.y
				}
				mutable_nodes.splice(mutable_nodes.indexOf(node), 1);
				new_v *= 1 - NODE_RESISTANCE;
				connections++;
			}
		}

		let components;
		if (seeking_components) {
			components = {...seeking_components};
		} else {
			components = { x: cos(c.a) * new_v, y: sin(c.a) * new_v }
		}

		stroke(lightning_color.r, lightning_color.g, lightning_color.b);
		strokeWeight(sqrt(c.v)*THICKNESS_FACTOR);
		push();
		translate(c.x, c.y);
		line(0, 0, components.x, components.y);
		pop();


		const r = random(0,1);
		let num_children;
		if (r < 1 - FORK_PROBABILITY*(c.v**2/INITIAL_VOLTAGE**2)) {
			num_children = 1;
		} else {
			num_children = 2;
		}

		if (num_children == 1) {
			const new_c = { 
				x: c.x + components.x,
				y: c.y + components.y,
				a: c.a + random(-TURN_MAX, TURN_MAX),
				v: new_v,
				f: c.f
			};
			lightning_inner(new_c);
			return;
		}

		const new_c = { 
			x: c.x + components.x,
			y: c.y + components.y,
			a: c.a + random(TURN_MAX),
			v: new_v,
		};
		lightning_inner(new_c);

		const new_c2 = {
			x: c.x + components.x,
			y: c.y + components.y,
			a: c.a - random(TURN_MAX),
			v: new_v,
		};
		lightning_inner(new_c2);
		return;

	}

	lightning_inner(c);

	return connections;
}

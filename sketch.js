let MIN_CONNECTIONS;
let TURN_MAX;
let SEEKING_TURN_MAX;
let FORK_PROBABILITY;
let INITIAL_VOLTAGE = 100;

const THICKNESS_FACTOR = 0.5;

const NODE_ATTRACTIVE_RANGE_FACTOR = 3;
const NODE_HIT_RANGE_FACTOR = 1.5;
const NODE_RESISTANCE = 0.95;

const NODES_START_X = 50;
const NODES_START_Y = 400;
const NODES_WIDTH = 800;
const NODES_HEIGHT = 225;

const CANVAS_WIDTH = 900;
const CANVAS_HEIGHT = 1000;

const LINE_THICKNESS = 10;
const DOT_THICKNESS = 15;

const nodes = []

let mutable_nodes = [];

function setup() {
	fetch('tape.txt').then(r => r.text()).then(tape => {
		createCanvas(CANVAS_WIDTH, CANVAS_HEIGHT);

		TURN_MAX = PI/8;
		SEEKING_TURN_MAX = PI/16;
		MIN_CONNECTIONS = 5;
		FORK_PROBABILITY = 0.3;

		loadNodes(tape);

		let top_left_connections = 0;
		let bottom_right_connections = 0;
		while(top_left_connections < MIN_CONNECTIONS || bottom_right_connections < MIN_CONNECTIONS) {
			background(10,10,10);
			mutable_nodes = [...nodes];
			top_left_connections = lightning({x: 0, y: 0, a: PI/4, v: INITIAL_VOLTAGE});
			bottom_right_connections = lightning({x: CANVAS_WIDTH, y: CANVAS_HEIGHT, a: 4.5*PI/4, v: INITIAL_VOLTAGE+10});
		}

		drawNodes();
	});
}

function loadNodes(tape) {

	const lines = tape.split('\n');
	const num_lines = lines.length;
	const line_length = lines[0].length;

	for (let line = 0; line < num_lines; line++) {
		for (let i = 0; i < line_length; i++) {
			const c = lines[line][i];
			if (c == '.') {
				const x =
					NODES_START_X + (NODES_WIDTH/line_length) * (i);
				const y =
					NODES_START_Y + (NODES_HEIGHT/num_lines) * line + 50;
				nodes.push({x: x, y: y});
			}
		}
	}
}

function drawNodes() {
	for (const n of nodes) {
		let alone = true;
		for (const m of nodes) {
			if (n != m) {
				if (distance(n.x, n.y, m.x, m.y) < 30) {
					strokeWeight(LINE_THICKNESS);
					stroke(0, 255, 0);
					line(n.x, n.y, m.x, m.y);
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

function distance(x1, y1, x2, y2) {
	return sqrt((x1-x2)**2 + (y1-y2)**2);
}

function lightning(c) {

	let connections = 0;

	function lightning_inner(c) {

		if (c.v < 1) {
			return;
		}

		let new_v = random(c.v*0.8, c.v) - 1;

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

		stroke(0,255,0);
		strokeWeight(sqrt(c.v)*THICKNESS_FACTOR);
		push();
		translate(c.x, c.y);
		line(0, 0, components.x, components.y);
		pop();


		const r = random(0,1);
		let num_children;
		if (r < 1 - FORK_PROBABILITY*sqrt(c.v/INITIAL_VOLTAGE)) {
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

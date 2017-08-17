var camera, scene, renderer, controls, gui;
var angle = 0;
var clock = new THREE.Clock();
var time; var startTime = new Date().getTime();

var box;
var eight;
var ground;
var shapes = [];

var analyser;

var SCROLL_SPEED = .001;

function resize(){
	camera.aspect = window.innerWidth / window.innerHeight;
	camera.updateProjectionMatrix();
	renderer.setSize( window.innerWidth, window.innerHeight );
}

function init() {
		var container = document.getElementById( 'container' );
		renderer = new THREE.WebGLRenderer({antialias: true});
		renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCSoftShadowMap;
		renderer.setPixelRatio( window.devicePixelRatio );
		renderer.setSize( window.innerWidth, window.innerHeight);
		renderer.setClearColor(0xededed);
		container.appendChild( renderer.domElement );
		
		var listener = new THREE.AudioListener();
		camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, .001, 10000 );
		camera.add(listener);
		camera.position.set(0, 0, 10);
		// controls = new THREE.TrackballControls(camera, renderer.domElement);
		// controls.rotateSpeed = 2.0;
		// controls.panSpeed = 0.8;
		// controls.zoomSpeed = 1.5;
		controls = new THREE.OrbitControls(camera, renderer.domElement);
		controls.zoomSpeed = 4.0;
		// controls = new THREE.FirstPersonControls(camera, renderer.domElement);
		// controls.moveSpeed = 1.0;

		var audioLoader = new THREE.AudioLoader();
		sound = new THREE.PositionalAudio(listener);
		audioLoader.load('assets/glow-like-dat.mp3', function(buffer){
			sound.setBuffer(buffer);
			sound.setRefDistance(2);
			sound.play();
		});

		analyser = new THREE.AudioAnalyser(sound, 32);

		scene = new THREE.Scene();

		var directionalLight = new THREE.DirectionalLight(0xffffff, .7);
		directionalLight.position.set(1, -1, 0).normalize();
		directionalLight.castShadow = true;
		var ambientLight = new THREE.AmbientLight(0xffffff);
		var pointLight = new THREE.PointLight(0xffffff);
		pointLight.position.set(0, 0, 0);

		scene.add(ambientLight);
		scene.add(directionalLight);
		scene.add(pointLight);

		scene.fog =  new THREE.FogExp2(0xededed);

		/* 88 */

		var video = document.createElement('video');
		video.src = 'assets/glow-like-dat.mp4';

		var videoTexture = new THREE.VideoTexture(video);
		videoTexture.minFilter = THREE.LinearFilter;
		videoTexture.magFilter = THREE.LinearFilter;
		videoTexture.format = THREE.RGBFormat;

		var fontLoader = new THREE.FontLoader();
		fontLoader.load(
			'assets/futura-bold.json', 

			function(font){

			var geom = new THREE.TextGeometry('88', {
				font : font,
				size : 1,
				height : .25
			});
			geom.center();

			var mat = new THREE.ShaderMaterial({
				vertexShader : document.getElementById('eightVertex').textContent,
				fragmentShader : document.getElementById('eightFragment').textContent
			});

			eight = new THREE.Mesh(geom, mat);
			eight.scale.set(3, 3, 3);
			eight.rotation.x = -Math.PI/2;
			eight.position.y += .5;
			eight.add(sound);
			scene.add(eight);

			eightLoaded = true;
		})

		/* TERRAIN */

		ground = new THREE.Group();

		var texture = new THREE.TextureLoader().load('assets/rain.jpg');
		texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
		var geom = new THREE.PlaneGeometry(1, 1, 128, 128);
		var shapeMat = new THREE.ShaderMaterial({
			// transparent: true,
			uniforms : {
				time : { value : 0. },
				texture : { value : texture},
				bumpValue : { value : 0.}
			},
			side : THREE.DoubleSide,
			// depthTest: false,
			vertexShader : document.getElementById('vertexShader').textContent,
			fragmentShader : document.getElementById('fragmentShader').textContent
		});

		var s = 12;
		for (var i=-1; i<2; i++){
			var shape = new THREE.Mesh(geom, shapeMat);
			shape.scale.set(s, s, s);
			shape.rotation.z = i*Math.PI/2;
			shape.position.set(0, i*(s - 1), 0);
			ground.add(shape);
			shapes.push(shape);
			// scene.add(shape);
		}

		ground.rotation.x = -Math.PI/2.055;

		scene.add(ground);

		window.addEventListener('resize', resize);
	}

	function update(){
		var delta = clock.getDelta();
		// controls.update(delta);
		controls.update();
		for (var i=0; i<shapes.length; i++){
			shapes[i].material.uniforms['time'].value += .0001;
			if(shapes[i].position.y <= -15)
				shapes[i].position.y = 11;
			shapes[i].position.y -= SCROLL_SPEED;
		}

		if (!eight)
			return;
		if(eight.position.z >= camera.position.z)
			eight.position.z = 0;
		eight.position.z += SCROLL_SPEED*10.;

		/*HANDLE AUDIO*/
		updateAudioData();
	}

	function updateAudioData(){
		if (analyser)

		var data = analyser.getAverageFrequency();
		var bumpVal;
		console.log(data);

		if (data < 120){
			bumpVal = data/50000;
		}
		else{
			bumpVal = data/5000;
		}
		shapes[0].material.uniforms.bumpValue.value = bumpVal;
	}

	function animate(){
		update();
		renderer.render(scene, camera);
		window.requestAnimationFrame(animate);
	}

	init();
	animate();
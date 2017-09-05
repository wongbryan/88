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
		video.mute = true;
		video.src = 'assets/glow-like-dat.mp4';
		// video.width = 512;
		// video.height = 256;

		var videoTexture = new THREE.VideoTexture(video);
		// videoTexture.wrapS = videoTexture.wrapT = THREE.RepeatWrapping;
		videoTexture.minFilter = THREE.LinearFilter;
		videoTexture.magFilter = THREE.LinearFilter;
		videoTexture.format = THREE.RGBFormat;

		var flowerTexture = new THREE.TextureLoader().load('assets/glow-like-dat-texture.png');
		flowerTexture.wrapS = flowerTexture.wrapT = THREE.RepeatWrapping;

		var fontLoader = new THREE.FontLoader();
		fontLoader.load(
			'assets/futura-bold.json', 

			function(font){

			var geometry = new THREE.TextGeometry('88', {
				font : font,
				size : 1,
				height : .25
			});
			geometry.center();

			/* ASSIGN UVs */

			geometry.computeBoundingBox();

		    var max     = geometry.boundingBox.max;
		    var min     = geometry.boundingBox.min;

		    var offset  = new THREE.Vector2(0 - min.x, 0 - min.y);
		    var range   = new THREE.Vector2(max.x - min.x, max.y - min.y);

		    geometry.faceVertexUvs[0] = [];
		    var faces = geometry.faces;

		    for (i = 0; i < geometry.faces.length ; i++) {

		      var v1 = geometry.vertices[faces[i].a];
		      var v2 = geometry.vertices[faces[i].b];
		      var v3 = geometry.vertices[faces[i].c];

		      geometry.faceVertexUvs[0].push([
		        new THREE.Vector2( ( v1.x + offset.x ) / range.x , ( v1.y + offset.y ) / range.y ),
		        new THREE.Vector2( ( v2.x + offset.x ) / range.x , ( v2.y + offset.y ) / range.y ),
		        new THREE.Vector2( ( v3.x + offset.x ) / range.x , ( v3.y + offset.y ) / range.y )
		      ]);

		    }

		    geometry.uvsNeedUpdate = true;

			var mat = new THREE.ShaderMaterial({
				uniforms : {
					texture : { value : videoTexture },
					time : { value : 0.0 },
					speed : { value : 1.0 }
				},
				vertexShader : document.getElementById('eightVertex').textContent,
				fragmentShader : document.getElementById('eightFragment').textContent
			});

			eight = new THREE.Mesh(geometry, mat);
			eight.scale.set(10, 10, 10);
			// eight.rotation.x = -Math.PI/2;
			eight.position.set(0, 0, 0);
			eight.add(sound);
			scene.add(eight);

			video.play();
		});

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
		eight.material.uniforms.time.value += .005;

		/*HANDLE AUDIO*/
		updateAudioData();
	}

	function updateAudioData(){
		if (analyser)

		var data = analyser.getAverageFrequency();
		var speed;

		if (data < 80){
			speed = .5;
			SCROLL_SPEED = .001;
		}
		else if (data < 100){
			speed = 2.;
		}
		else if (data < 140){
			speed = 2.5;
		}
		else{
			speed = 3;
		}
		eight.material.uniforms.speed.value = speed;
	}

	function animate(){
		update();
		renderer.render(scene, camera);
		window.requestAnimationFrame(animate);
	}

	init();
	animate();
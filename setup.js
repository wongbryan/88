var SCREEN_WIDTH = window.innerWidth, SCREEN_HEIGHT = window.innerHeight;

var camera, scene, renderer, controls, gui;
var angle = 0;
var clock = new THREE.Clock();
var time; var startTime = new Date().getTime();

var box;
var eight;
var ground;
var terrain;
var shapes = [];

var analyser;

var SCROLL_SPEED = .001;

/*RENDER TARGET SCENE*/
var sceneRenderTarget, cameraOrtho;
var quadTarget;

/*UNIFORMS*/
var uniformsNoise, uniformsNormal, uniformsTerrain;

/*MAPS*/
var heightMap, normalMap;

/*SHADERS*/
var normalShader, terrainShader; //note: noise shader in init loop

/*MATERIAL LIBRARY TO ACCESS MATS FOR TERRAIN, NORMAL MAP, HEIGHT MAP*/
var materialLibrary = {}; 

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
		// controls.zoomSpeed = 4.0;
		// controls = new THREE.FirstPersonControls(camera, renderer.domElement);
		// controls.moveSpeed = 1.0;

		var audioLoader = new THREE.AudioLoader();
		sound = new THREE.PositionalAudio(listener);
		audioLoader.load('assets/glow-like-dat.mp3', function(buffer){
			sound.setBuffer(buffer);
			sound.setRefDistance(2);
			// sound.play();
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

		/*RENDER HEIGHT MAP/NORMAL MAP TO A TARGET*/
		var rx = 256, ry = 256;
		var pars = { minFilter: THREE.LinearFilter, magFilter: THREE.LinearFilter, format: THREE.RGBFormat };
		
		heightMap = new THREE.WebGLRenderTarget(rx, ry, pars);
		heightMap.texture.generateMipMaps = false;

		normalMap = new THREE.WebGLRenderTarget(rx, ry, pars);
		normalMap.texture.generateMipMaps = false;

		uniformsNoise = {
			time : { value : 1.0 }
		};

		var genericVertexShader = document.getElementById('genericVertexShader').textContent;
		var noiseFragmentShader = document.getElementById('noiseFragmentShader').textContent;

		/*NORMAL SHADER*/
		normalShader = THREE.NormalMapShader;
		uniformsNormal = THREE.UniformsUtils.clone(normalShader.uniforms);
		uniformsNormal['heightMap'].value = heightMap.texture; //normal shader takes in our generated height map texture

		/*LOAD TEXTURES*/
		var textureLoader = new THREE.TextureLoader();

		var diffuseTexture1 = textureLoader.load( "assets/grasslight-big.jpg");
		var diffuseTexture2 = textureLoader.load( "assets/backgrounddetailed6.jpg" );
		var detailTexture = textureLoader.load( "assets/grasslight-big-nm.jpg" );
		diffuseTexture1.wrapS = diffuseTexture1.wrapT = THREE.RepeatWrapping;
		diffuseTexture2.wrapS = diffuseTexture2.wrapT = THREE.RepeatWrapping;
		detailTexture.wrapS = detailTexture.wrapT = THREE.RepeatWrapping;

		/*TERRAIN SHADER*/
		terrainShader = THREE.ShaderTerrain.terrain;

		uniformsTerrain = THREE.UniformsUtils.clone(terrainShader.uniforms);

		//Need displacement and normals. Get texture from render targets instead of an image
		uniformsTerrain[ 'tNormal' ].value = normalMap.texture;
		uniformsTerrain[ 'uNormalScale' ].value = 3.5;
		uniformsTerrain[ 'tDisplacement' ].value = heightMap.texture;
		uniformsTerrain[ 'uDisplacementScale' ].value = 375;
		uniformsTerrain[ 'uRepeatOverlay' ].value.set( 6, 6 );

		uniformsTerrain[ 'tDiffuse1' ].value = diffuseTexture1;
		uniformsTerrain[ 'tDiffuse2' ].value = diffuseTexture2;
		uniformsTerrain[ 'tDetail' ].value = detailTexture;

		uniformsTerrain[ 'enableDiffuse1' ].value = true;
		uniformsTerrain[ 'enableDiffuse2' ].value = true;

		uniformsTerrain[ 'diffuse' ].value.setHex( 0xffffff );
		uniformsTerrain[ 'shininess' ].value = 30;

		/*CREATE AN ARRAY OF RENDER PROGRAMS*/
		var params = [	
			['heightMap', noiseFragmentShader, genericVertexShader, uniformsNoise, false],
			['normalMap', normalShader.fragmentShader, normalShader.vertexShader, uniformsNormal, false],
			['terrain', terrainShader.fragmentShader, terrainShader.vertexShader, uniformsTerrain, true]
		];

		for (var i=0; i<params.length; i++){
			var material = new THREE.ShaderMaterial({
				uniforms : params[i][3],
				vertexShader : params[i][2],
				fragmentShader : params[i][1],
				lights : params[i][4]
			});

			materialLibrary[ params[i][0] ] = material;
		}

		/*CREATE SCENE FOR RENDER TARGETS*/

		sceneRenderTarget = new THREE.Scene();
		cameraOrtho = new THREE.OrthographicCamera( SCREEN_WIDTH / - 2, SCREEN_WIDTH / 2, SCREEN_HEIGHT / 2, SCREEN_HEIGHT / - 2, -1000, 1000 );
		sceneRenderTarget.add(cameraOrtho);
		// cameraOrtho.position.z = 100;

		var plane = new THREE.PlaneBufferGeometry( SCREEN_WIDTH, SCREEN_HEIGHT );
		quadTarget = new THREE.Mesh( plane, new THREE.MeshBasicMaterial( { color: 0x000000 } ) );
		quadTarget.position.z = 0;
		sceneRenderTarget.add( quadTarget );
		// scene.add(quadTarget);

		/*CREATE TERRAIN*/

		var terrainGeom = new THREE.PlaneBufferGeometry(6000, 6000, 256, 256);
		THREE.BufferGeometryUtils.computeTangents(terrainGeom);

		terrain = new THREE.Mesh(terrainGeom, materialLibrary['terrain']);
		terrain.rotation.x = 3*Math.PI/2;
		scene.add(terrain);

		var flowerTexture = new THREE.TextureLoader().load('assets/glow-like-dat-texture.png');
		flowerTexture.wrapS = flowerTexture.wrapT = THREE.RepeatWrapping;

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
				uniforms : {
					texture : { value : flowerTexture },
					time : { value : 0.0 },
					speed : { value : 1.0 }
				},
				vertexShader : document.getElementById('eightVertex').textContent,
				fragmentShader : document.getElementById('eightFragment').textContent
			});

			eight = new THREE.Mesh(geom, mat);
			eight.scale.set(.75, .75, .75);
			// eight.rotation.x = -Math.PI/2;
			eight.position.set(0, .5, 8);
			eight.add(sound);
			// scene.add(eight);

			// video.play();
		});

		// /* TERRAIN */

		// ground = new THREE.Group();

		// var texture = new THREE.TextureLoader().load('assets/rain.jpg');
		// texture.wrapS = texture.wrapT = THREE.RepeatWrapping;
		// var geom = new THREE.PlaneGeometry(1, 1, 128, 128);
		// var shapeMat = new THREE.ShaderMaterial({
		// 	// transparent: true,
		// 	uniforms : {
		// 		time : { value : 0. },
		// 		texture : { value : texture},
		// 		bumpValue : { value : 0.}
		// 	},
		// 	side : THREE.DoubleSide,
		// 	// depthTest: false,
		// 	vertexShader : document.getElementById('vertexShader').textContent,
		// 	fragmentShader : document.getElementById('fragmentShader').textContent
		// });

		// var s = 12;
		// for (var i=-1; i<1; i++){
		// 	var shape = new THREE.Mesh(geom, shapeMat);
		// 	shape.scale.set(s, s, s);
		// 	shape.rotation.z = i*Math.PI/2;
		// 	shape.position.set(0, i*(s - 1), 0);
		// 	ground.add(shape);
		// 	shapes.push(shape);
		// 	// scene.add(shape);
		// }

		// ground.rotation.x = -Math.PI/2.045;

		// // scene.add(ground);

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
		// updateAudioData();
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
		// eight.material.uniforms.speed.value = speed;
	}

	function animate(){
		update();

		quadTarget.material = materialLibrary['heightMap'];
		renderer.render(sceneRenderTarget, cameraOrtho, heightMap, true);

		quadTarget.material = materialLibrary['normalMap'];
		renderer.render(sceneRenderTarget, cameraOrtho, normalMap, true);

		renderer.render(scene, camera);
		window.requestAnimationFrame(animate);
	}

	init();
	animate();
//Vertex and fragment shaders
let VSHADER_SOURCE = [
    'attribute vec4 a_Position;',
    'attribute vec4 a_Color;',
    'attribute vec4 a_Normal;',
    'attribute vec2 a_TextureCoords;',

    'uniform mat4 u_ProjMatrix;',
    'uniform mat4 u_ViewMatrix;',
    'uniform mat4 u_ModelMatrix;',
    'uniform mat4 u_NormalMatrix;',

    'varying vec4 v_Color;',
    'varying vec3 v_Normal;',
    'varying vec2 v_TextureCoords;',
    'varying vec3 v_Position;',

    'void main() {',
    '  gl_Position = u_ProjMatrix * u_ViewMatrix * u_ModelMatrix * a_Position;',
    '  v_Position = vec3(u_ModelMatrix * a_Position);',
    '  v_Normal = normalize(vec3(u_NormalMatrix * a_Normal));',
    '  v_Color = a_Color;',
    '  v_TextureCoords = a_TextureCoords;',
    '}'].join('\n');

let FSHADER_SOURCE = [
    'precision mediump float;',

    'uniform bool u_UseTextures;',
    'uniform vec3 u_LightPosition[4];',
    'uniform vec3 u_LightColor[4];',
    'uniform vec3 u_AmbientLight;',

    'varying vec3 v_Normal;',
    'varying vec3 v_Position;',
    'varying vec4 v_Color;',

    'uniform sampler2D u_Sampler;',
    'varying vec2 v_TextureCoords;',
    
    'void main() {',
    '  vec4 col = u_UseTextures ? texture2D(u_Sampler, v_TextureCoords) : v_Color;',
    '  vec3 normal = normalize(v_Normal);',
    '  vec3 f_color = u_AmbientLight * col.rgb;',
    '  vec3 diffuse;',
    '  for (int i = 0; i < 3; i++) {',
    '       vec3 lightDirection = normalize(u_LightPosition[i] - v_Position);',
    '       float nDotL = max(dot(lightDirection, normal), 0.0);',
    '       diffuse = u_LightColor[i] * col.rgb * nDotL;',
    '       float distanceToLight = length(u_LightPosition[i] - v_Position);',
    '       float attenuation = 1.0 / (1.0 + 0.035 * pow(distanceToLight, 2.0));',
    '       f_color += attenuation * diffuse;',
    '   }',
    '   gl_FragColor = vec4(f_color, col.a);',
    '}'].join('\n');

//Specify initial positions of animated furniture

//Rug
let rug_position = 0.1;
let rug_loc = 0.1;

//Books on shelves
let book_position = 0.1;
let book_loc = 0.1;

// Dining chairs
let chair_position = 0;
let chair_loc = 5;

//Sofa
let sofa_position = 0;
let sofa_loc = 0.1;

let modelMatrix = new Matrix4(); // Model matrix
let viewMatrix = new Matrix4();  // View matrix
let projMatrix = new Matrix4();  // Projection matrix
let normalMatrix = new Matrix4();  //Normal matrix

let u_ModelMatrix, u_ViewMatrix, u_NormalMatrix, u_ProjMatrix, u_LightColor,
    u_LightPosition, u_Sampler, u_UseTextures, u_AmbientLight;

let light_pos = [-30, 10, 15]; //Initial light position
let ambient_onoff = [1, 1, 1]; //Ambient lighting initially on

//Positions of point/directional lighting
let LIGHT_POS = [
    -1, 1.5, 0, // Living area
    -4, 4.5, 5,  // Office
    4, 4.5, -5,  // Dining table
];

//Lighting colors. Directional lights are always white. Ambient lighting toggles between white and dimmed.
let LIGHT_RGB = [
    0/255, 0/255, 0/255, 0/255, 0/255, 0/255,
    0/255, 0/255, 0/255, ambient_onoff[0], ambient_onoff[1], ambient_onoff[2]
];
let r;
let g;
let b;

let push_pop_matrices = [];
let DIRECTIONAL_LIGHTS = false; //Initially off
let AMBIENT_LIGHT = 1;

let FRIDGE_DOOR = false; //By default fridge is closed
let DINING_CHAIRS = false; //Dining chairs movement
let OFFICE = false; //Office chair and laptop animation
let BAR_STOOL = false; //Bar stool movement

//Initialize view of room
var incrementAngle = 3.0;  // The increments of rotation angle (degrees)
var x_view = 0.0;    // The rotation x angle (degrees)
var y_view = 92.0;    // The rotation y angle (degrees)
var z_view = 0.0; // Rotation z angle (degrees)
var x_position_incr = -2; //movement of the camera in the x direction
var y_position_incr = 5; // movement of the camera in the y direction
var z_position_incr = 10; // movement of the camera in the z direction

//Initialize state for animated items
let rug_move = false;
let books_move = false;
let chairs_move = false;
let sofa_move = false;

let keys = [];
let prev = 0;
let curr = 0;

function main() {

    let canvas = document.getElementById('webgl_canvas');
    let gl = getWebGLContext(canvas);
    if (!gl) {
        console.log('Failed to get WebGL rendering context.');
        return;
    }
    if (!initShaders(gl, VSHADER_SOURCE, FSHADER_SOURCE)) {
        console.log('Failed to intialize shaders.');
        return;
    }

    gl.clearColor(169/255, 169/255,169/255, 1.0); //Light gray background
    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    // Clear buffers
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    u_UseTextures = gl.getUniformLocation(gl.program, "u_UseTextures");
    // Initially, textures are set to off
    gl.uniform1i(u_UseTextures, 0);

    //Load texture files - make sure program is running on a local server
    let hardwoodFloors = gl.createTexture();
    hardwoodFloors.image = new Image();
    hardwoodFloors.image.crossOrigin = "anonymous";
    hardwoodFloors.image.src = './textures/hardwood.jpg';
    hardwoodFloors.image.onload = function () {
        importText(gl, hardwoodFloors, gl.TEXTURE0);
    };

    //Marble surface
    let marble = gl.createTexture();
    marble.image = new Image();
    marble.image.crossOrigin = "anonymous";
    marble.image.src = './textures/marble.jpg';
    marble.image.onload = function () {
        importText(gl, marble, gl.TEXTURE1);
    };

    //Black woods surface
    let blackWoodfinish = gl.createTexture();
    blackWoodfinish.image = new Image();
    blackWoodfinish.image.crossOrigin = "anonymous";
    blackWoodfinish.image.src = './textures/blackwood.jpg';
    blackWoodfinish.image.onload = function () {
        importText(gl, blackWoodfinish, gl.TEXTURE2);
    };

    //Beige upholstery
    let beigeUpholstery = gl.createTexture();
    beigeUpholstery.image = new Image();
    beigeUpholstery.image.crossOrigin = "anonymous";
    beigeUpholstery.image.src = './textures/leatheroption.jpg';
    beigeUpholstery.image.onload = function () {
        importText(gl, beigeUpholstery, gl.TEXTURE3);
    };

    //Navy upholstery
    let navyUpholstery = gl.createTexture();
    navyUpholstery.image = new Image();
    navyUpholstery.image.crossOrigin = "anonymous";
    navyUpholstery.image.src = './textures/navyfabric.jpg';
    navyUpholstery.image.onload = function () {
        importText(gl, navyUpholstery, gl.TEXTURE8);
    };
  
    //Leather (blue)
    let leather = gl.createTexture();
    leather.image = new Image();
    leather.image.crossOrigin = "anonymous";
    leather.image.src = './textures/leatherblu.jpg';
    leather.image.onload = function () {
        importText(gl, leather, gl.TEXTURE4);
    };

    //White lacquer surface
    let whiteLacquer = gl.createTexture();
    whiteLacquer.image = new Image();
    whiteLacquer.image.crossOrigin = "anonymous";
    whiteLacquer.image.src = './textures/whitelacquer.jpg';
    whiteLacquer.image.onload = function () {
        importText(gl, whiteLacquer, gl.TEXTURE5);
    };

    //Leather (beige)
    let quiltedLeather = gl.createTexture();
    quiltedLeather.image = new Image();
    quiltedLeather.image.crossOrigin = "anonymous";
    quiltedLeather.image.src = './textures/leathercreme.jpg';
    quiltedLeather.image.onload = function () {
        importText(gl, quiltedLeather, gl.TEXTURE6);
    };

    //TV screen
    let tvScreen = gl.createTexture();
    tvScreen.image = new Image();
    tvScreen.image.crossOrigin = "anonymous";
    tvScreen.image.src = './textures/tvscreen.jpg';
    tvScreen.image.onload = function () {
        importText(gl, tvScreen, gl.TEXTURE7);
    };
    
    //Rug pattern
    let rugPattern = gl.createTexture();
    rugPattern.image = new Image();
    rugPattern.image.crossOrigin = "anonymous";
    rugPattern.image.src = './textures/rug.jpg';
    rugPattern.image.onload = function () {
        importText(gl, rugPattern, gl.TEXTURE9);
    };

    //Computer screen
    let compScreen = gl.createTexture();
    compScreen.image = new Image();
    compScreen.image.crossOrigin = "anonymous";
    compScreen.image.src = './textures/code.jpg';
    compScreen.image.onload = function () {
        importText(gl, compScreen, gl.TEXTURE10);
    };

    //Kitchen floor tiles
    let floorTile = gl.createTexture();
    floorTile.image = new Image();
    floorTile.image.crossOrigin = "anonymous";
    floorTile.image.src = './textures/tile.jpg';
    floorTile.image.onload = function () {
        importText(gl, floorTile, gl.TEXTURE11);
    };

    //Light wood surface
    let lightWood = gl.createTexture();
    lightWood.image = new Image();
    lightWood.image.crossOrigin = "anonymous";
    lightWood.image.src = './textures/lightwood.jpg';
    lightWood.image.onload = function () {
        importText(gl, lightWood, gl.TEXTURE12);
    };
   
    //Silver finish
    let silver = gl.createTexture();
    silver.image = new Image();
    silver.image.crossOrigin = "anonymous";
    silver.image.src = './textures/silver.jpg';
    silver.image.onload = function () {
        importText(gl, silver, gl.TEXTURE13);
    };
   
    //Get the storage locations of uniform attributes
    u_ModelMatrix = gl.getUniformLocation(gl.program, 'u_ModelMatrix');
    u_ViewMatrix = gl.getUniformLocation(gl.program, 'u_ViewMatrix');
    u_NormalMatrix = gl.getUniformLocation(gl.program, 'u_NormalMatrix');
    u_ProjMatrix = gl.getUniformLocation(gl.program, 'u_ProjMatrix');
    u_LightColor = gl.getUniformLocation(gl.program, 'u_LightColor');
    u_LightPosition = gl.getUniformLocation(gl.program, 'u_LightPosition');
    u_AmbientLight = gl.getUniformLocation(gl.program, 'u_AmbientLight');
    u_UseTextures = gl.getUniformLocation(gl.program, "u_UseTextures");


    if (!u_ModelMatrix || !u_ViewMatrix || !u_NormalMatrix || !u_ProjMatrix || !u_LightColor || !u_LightPosition) {
        console.log('Failed to get storage location.');
        return;
    }

    projMatrix.setPerspective(50, canvas.width/canvas.height, 1, 100);
  
    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
    gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

    u_Sampler = gl.getUniformLocation(gl.program, 'u_Sampler');
    gl.uniform3f(u_AmbientLight,  1, 1, 1);

    //Listening for a key press
    window.addEventListener("keydown", (event) => {
        switch (event.key) {
            case "1": //Ambient lighting on/off
                if (AMBIENT_LIGHT === 1) {
                    ambient_onoff = [0.4, 0.4, 0.4];
                    light_pos = [30, 30, 10];
                    gl.uniform3f(u_AmbientLight, 0.5, 0.5, 0.5);
                    AMBIENT_LIGHT = 2;
                }
                else{
                    ambient_onoff = [1, 1, 1];
                    light_pos = [30, 30, 10];
                    gl.uniform3f(u_AmbientLight, 1, 1, 1);
                    AMBIENT_LIGHT = 1;
                }
                break;
            case "2": //Directional lighting on/off
                DIRECTIONAL_LIGHTS = !DIRECTIONAL_LIGHTS;
                if(DIRECTIONAL_LIGHTS){
                    r = 200/255;
                    g = 200/255;
                    b = 200/255;
                }
                else{
                    r = 0/255;
                    g = 0/255;
                    b = 0/255;
                }
                LIGHT_RGB = [
                    r, g, b,
                    r, g, b,
                    r, g, b,
                    ambient_onoff[0], ambient_onoff[1], ambient_onoff[2]
                ];
                break;
            case "3": //Control the office chair and laptop
                OFFICE = !OFFICE;
                break;
            case "4": //Control the refrigerator door opening/closing
                FRIDGE_DOOR = !FRIDGE_DOOR;
                break;
            case "5": //Control the bar stool movement
                BAR_STOOL = !BAR_STOOL;
                break;
            case "6": //Control the dining chairs movement 1
                DINING_CHAIRS = !DINING_CHAIRS;
                break;
            case "7": //Control the dining chairs movement 2
                chairs_move = true;
                break;
            case "8": //Move the rug
                rug_move = true;
                break;
            case "9": //Move the books
                books_move = true;
                break;
            case "0": //Move the sofa
                sofa_move = true;
                break;
            
        }
        keys.push(event.key);
    });

    //Animation
    let animate = function () {
        //Animate rug movement
        if(rug_move){
            rug_position += rug_loc;
            if(rug_position > 10){
                rug_loc = -Math.abs(rug_loc);
            }
            else if(rug_position < 0.1){
                rug_loc = Math.abs(rug_loc);
            }
        }

        //Animate book movement
        if(books_move){
            book_position += book_loc;
            if(book_position > 1){
                book_loc = -Math.abs(book_loc);
            }
            else if(book_position < 0.1){
                book_loc = Math.abs(book_loc);
            }
        }

        //Animate dining chairs movement
        if(chairs_move){
            chair_position += chair_loc;
            if(chair_position > 60){
                chair_loc = -Math.abs(chair_loc);
            }
            else if(chair_position < 0){
                chair_loc = Math.abs(chair_loc);
            }
        }

        //Animate sofa movement
        if(sofa_move){
            sofa_position += sofa_loc;
            if(sofa_position > 4){
                sofa_loc = -Math.abs(sofa_loc);
            }
            else if(sofa_position < 0.1){
                sofa_loc = Math.abs(sofa_loc);
            }
        }

        //Modify camera position
        for (let key of keys) {
            switch (key) {
                case "ArrowUp": // Up arrow key
                    x_view = (x_view + incrementAngle) % 360; //Increment along x-axis in + direction
                    break;

                case "ArrowDown": // Down arrow key 
                    x_view = (x_view - incrementAngle) % 360; //Increment along x-axis in - direction
                    break;

                case "ArrowLeft": // Left arrow key 
                    y_view = (y_view - incrementAngle) % 360;  //Increment along y-axis in + direction
                    break;

                case "ArrowRight": // Right arrow key 
                    y_view = (y_view + incrementAngle) % 360; //Increment along y-axis in - direction
                    break;
                case "w": // w key
                    z_position_incr -= 1; //Move camera position forwards
                    break;
                case "s": // s key
                    z_position_incr += 1; //Move camera position back
                    break;
                case "d": // d key
                    x_position_incr += 1; //Move camera position right
                    break;
                case "a": // a key
                    x_position_incr -= 1; //Move camera position left
                    break;
                case "t": // t key
                    y_position_incr += 1; //Move camera position up
                    break;
                case "g": // g key
                    y_position_incr -= 1; //Move camera position down
            }
        }
        gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
        draw(gl, u_ModelMatrix, u_NormalMatrix, u_UseTextures);
        requestAnimationFrame(animate)     
    };

    //When key is released, animations halt
    window.addEventListener("keyup", (event) => {
        keys.splice(keys.indexOf(event.key));
        rug_move = false;
        books_move = false;
        chairs_move = false;
        sofa_move = false;
    });
    animate();


//Manage matrix stack
function pushMatrix(m) {
    push_pop_matrices.push(new Matrix4(m));
}

function popMatrix() {
    return push_pop_matrices.pop();
}

function draw(gl, u_ModelMatrix, u_NormalMatrix, u_UseTextures) {
    const USE_TEXTURES = gl.getUniform(gl.program, u_UseTextures);

    //Lighting
    gl.uniform3fv(u_LightColor, LIGHT_RGB);  // Light color
    gl.uniform3fv(u_LightPosition, LIGHT_POS); // Light position

    //Set background color of canvas
    gl.clearColor(215/255, 224/255,230/255, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    //Dynamically update model view based on user key presses
    viewMatrix.setLookAt(x_position_incr, y_position_incr, z_position_incr, x_position_incr+3, y_position_incr-10, z_position_incr-17, 0, 1, 0);

    gl.uniformMatrix4fv(u_ViewMatrix, false, viewMatrix.elements);
    gl.uniformMatrix4fv(u_ProjMatrix, false, projMatrix.elements);

    let n = initVertexBuffers(gl, 204/255, 204/255, 204/255, 1);
    if (n < 0) {
        console.log('Failed to set the vertex information');
        return;
    }
    //Texture the furniture by default
    gl.uniform1i(u_UseTextures, 1);

    gl.activeTexture(gl.TEXTURE0);
    gl.uniform1i(u_Sampler, 0);

    n = initVertexBuffers(gl, 255/255, 180/255, 127/255, 1);
    
    //Enable manipulations of the entire model
    modelMatrix.setTranslate(0, 5, 0);  // Translation
    modelMatrix.setRotate(y_view, 0, 1, 0); // Rotate along y axis
    modelMatrix.rotate(x_view, 1, 0, 0); // Rotate along x axis
    modelMatrix.rotate(z_view, 0, 0, 1); // Rotate along z axis
    pushMatrix(modelMatrix);
    
    //Begin modelling

    // Model the floor
    pushMatrix(modelMatrix);
    modelMatrix.scale(10.0, 0.05, 9.0); // Scale
    modelMatrix.translate(0, -40, 0);  // Translation
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
    
    // Model furniture pieces as child objects of the parent model object

    //Model a dining chair 1
    gl.activeTexture(gl.TEXTURE4);
    gl.uniform1i(u_Sampler, 4);

    if(!DINING_CHAIRS){ //Account for possible geometric transform
    // Model the chair seat
    pushMatrix(modelMatrix);
    modelMatrix.translate(-2, -1.35, -2);  // Translation
    modelMatrix.rotate(0,0,1,0); // Rotate
    modelMatrix.scale(0.7, 0.11, 0.7); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

        // Model the chair back
        pushMatrix(modelMatrix);
        modelMatrix.translate(0.45, 3, 0);  // Translation
        modelMatrix.scale(0.11, 6, 1); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();

        gl.activeTexture(gl.TEXTURE2);
        gl.uniform1i(u_Sampler, 2);

        // Model the chair leg 1
        pushMatrix(modelMatrix);
        modelMatrix.translate(0.45, -2.5, -0.45);  // Translation
        modelMatrix.scale(0.12, 6, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();

        // Model the chair leg 2
        pushMatrix(modelMatrix);
        modelMatrix.translate(-0.45, -2.5, 0.45);  // Translation
        modelMatrix.scale(0.12, 6, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();

        // Model the chair leg 3
        pushMatrix(modelMatrix);
        modelMatrix.translate(-0.45, -2.5, -0.45);  // Translation
        modelMatrix.scale(0.12, 6, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();

        // Model the chair leg 4
        pushMatrix(modelMatrix);
        modelMatrix.translate(0.45, -2.5, 0.45);  // Translation
        modelMatrix.scale(0.12, 6, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();
    modelMatrix = popMatrix();
    } else{
    // Model the chair seat
    pushMatrix(modelMatrix);
    modelMatrix.translate(-1, -1.35, -2);  // Translation
    modelMatrix.rotate(-45,0,1,0); //Rotate
    modelMatrix.scale(0.7, 0.11, 0.7); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

        // Model the chair back
        pushMatrix(modelMatrix);
        modelMatrix.translate(0.45, 3, 0);  // Translation
        modelMatrix.scale(0.11, 6, 1); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();

        gl.activeTexture(gl.TEXTURE2);
        gl.uniform1i(u_Sampler, 2);

        // Model the chair leg 1
        pushMatrix(modelMatrix);
        modelMatrix.translate(0.45, -2.5, -0.45);  // Translation
        modelMatrix.scale(0.12, 6, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();

        // Model the chair leg 2
        pushMatrix(modelMatrix);
        modelMatrix.translate(-0.45, -2.5, 0.45);  // Translation
        modelMatrix.scale(0.12, 6, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();

        // Model the chair leg 3
        pushMatrix(modelMatrix);
        modelMatrix.translate(-0.45, -2.5, -0.45);  // Translation
        modelMatrix.scale(0.12, 6, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();

        // Model the chair leg 4
        pushMatrix(modelMatrix);
        modelMatrix.translate(0.45, -2.5, 0.45);  // Translation
        modelMatrix.scale(0.12, 6, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();
    modelMatrix = popMatrix();

    }
    //Model a dining chair 2
    gl.activeTexture(gl.TEXTURE4);
    gl.uniform1i(u_Sampler, 4);

    // Model the chair seat
    pushMatrix(modelMatrix);
    modelMatrix.translate(-2, -1.35, -3);  // Translation
    modelMatrix.rotate(0-chair_position/2,0,1,0); // Rotate w/ animations
    modelMatrix.scale(0.7, 0.11, 0.7); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

    // Model the chair back
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.45, 3, 0);  // Translation
    modelMatrix.scale(0.11, 6, 1); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);

    // Model the chair leg 1
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.45, -2.5, -0.45);  // Translation
    modelMatrix.scale(0.12, 6, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair leg 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45, -2.5, 0.45);  // Translation
    modelMatrix.scale(0.12, 6, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair leg 3
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45, -2.5, -0.45);  // Translation
    modelMatrix.scale(0.12, 6, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair leg 4
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.45, -2.5, 0.45);  // Translation
    modelMatrix.scale(0.12, 6, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    modelMatrix = popMatrix();

    //Model a dining chair 3
    gl.activeTexture(gl.TEXTURE4);
    gl.uniform1i(u_Sampler, 4);

    // Model the chair seat
    pushMatrix(modelMatrix);
    modelMatrix.translate(-3.7, -1.35, -3);  // Translation
    modelMatrix.rotate(0-chair_position/2,0,1,0);
    modelMatrix.scale(0.7, 0.11, 0.7); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

    // Model the chair back
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45, 3, 0);  // Translation
    modelMatrix.scale(0.11, 6, 1); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);

    // Model the chair leg 1
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.45, -2.5, -0.45);  // Translation
    modelMatrix.scale(0.12, 6, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair leg 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45, -2.5, 0.45);  // Translation
    modelMatrix.scale(0.12, 6, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair leg 3
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45, -2.5, -0.45);  // Translation
    modelMatrix.scale(0.12, 6, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair leg 4
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.45, -2.5, 0.45);  // Translation
    modelMatrix.scale(0.12, 6, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    modelMatrix = popMatrix()

    //Model a dining chair 4
    gl.activeTexture(gl.TEXTURE4);
    gl.uniform1i(u_Sampler, 4);

    if(!DINING_CHAIRS){ //Account for geometric transform on key press

    // Model the chair seat
    pushMatrix(modelMatrix);
    modelMatrix.translate(-3.7, -1.35, -2);  // Translation
    modelMatrix.rotate(0,0,1,0);
    modelMatrix.scale(0.7, 0.11, 0.7); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

    // Model the chair back
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45, 3, 0);  // Translation
    modelMatrix.scale(0.11, 6, 1); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);

    // Model the chair leg 1
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.45, -2.5, -0.45);  // Translation
    modelMatrix.scale(0.12, 6, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair leg 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45, -2.5, 0.45);  // Translation
    modelMatrix.scale(0.12, 6, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair leg 3
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45, -2.5, -0.45);  // Translation
    modelMatrix.scale(0.12, 6, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair leg 4
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.45, -2.5, 0.45);  // Translation
    modelMatrix.scale(0.12, 6, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    modelMatrix = popMatrix()
    } else {
    // Model the chair seat
    pushMatrix(modelMatrix);
    modelMatrix.translate(-4.3, -1.35, -2);  // Translation
    modelMatrix.rotate(45,0,1,0);
    modelMatrix.scale(0.7, 0.11, 0.7); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

    // Model the chair back
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45, 3, 0);  // Translation
    modelMatrix.scale(0.11, 6, 1); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);

    // Model the chair leg 1
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.45, -2.5, -0.45);  // Translation
    modelMatrix.scale(0.12, 6, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair leg 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45, -2.5, 0.45);  // Translation
    modelMatrix.scale(0.12, 6, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair leg 3
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45, -2.5, -0.45);  // Translation
    modelMatrix.scale(0.12, 6, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the chair leg 4
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.45, -2.5, 0.45);  // Translation
    modelMatrix.scale(0.12, 6, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    modelMatrix = popMatrix()
    }

    gl.activeTexture(gl.TEXTURE9);
    gl.uniform1i(u_Sampler, 9);

    //Model a rug
    pushMatrix(modelMatrix);
    modelMatrix.translate(-2.8+rug_position/2, -1.9, -2.5);
    modelMatrix.scale(2.75, 0.01, 3.5);
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();


    //Model a dining table
    gl.activeTexture(gl.TEXTURE1);
    gl.uniform1i(u_Sampler, 1);

    // Model the table surface
    pushMatrix(modelMatrix);
    modelMatrix.translate(-2.8, -1.1, -2.5);  // Translation
    modelMatrix.scale(1.5, 0.08, 2.75); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);

    // Model the table leg 1
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45,-5,0.45);  // Translation
    modelMatrix.scale(0.08, 10, 0.08); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the table leg 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.45,-5,0.45);  // Translation
    modelMatrix.scale(0.08, 10, 0.08); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the table leg 3
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45,-5,-0.45);  // Translation
    modelMatrix.scale(0.08, 10, 0.08); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the table leg 4
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.45,-5,-0.45);  // Translation
    modelMatrix.scale(0.08, 10, 0.08); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    modelMatrix = popMatrix();

    //Model a TV
    gl.uniform1i(u_UseTextures, 1);
    gl.activeTexture(gl.TEXTURE1);
    gl.uniform1i(u_Sampler, 1);
    // Model the tv stand surface
    pushMatrix(modelMatrix);
    modelMatrix.translate(4.6, -1.6, -2.5);  // Translation
    modelMatrix.scale(0.8, 0.08, 2.5); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);

    // Model the stand leg 1
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.45, -1.80, 0.48);  // Translation
    modelMatrix.scale(0.12, 4, 0.05); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the stand leg 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45, -1.80, 0.48);  // Translation
    modelMatrix.scale(0.12, 4, 0.05); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the stand leg 3
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.45, -1.80, -0.48);  // Translation
    modelMatrix.scale(0.12, 4, 0.05); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the stand leg 4
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45, -1.80, -0.48);  // Translation
    modelMatrix.scale(0.12, 4, 0.05); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
    modelMatrix = popMatrix();

    // Model the tv base
    pushMatrix(modelMatrix);
    modelMatrix.translate(4.6, -1.55, -2.5);  // Translation
    modelMatrix.scale(0.4, 0.08, 1.5); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

    // Model the tv arm
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 0, 0);  // Translation
    modelMatrix.scale(0.1, 4, 0.15); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model the tv screen
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 8.5, 0);  // Translation
    modelMatrix.scale(0.1, 14, 1.2); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    gl.activeTexture(gl.TEXTURE7);
    gl.uniform1i(u_Sampler, 7);

    // Model the tv display
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.03, 8.5, 0);  // Translation
    modelMatrix.scale(0.05, 12.5, 1.1); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    modelMatrix = popMatrix();

    //Model a sofa
    gl.activeTexture(gl.TEXTURE6);
    gl.uniform1i(u_Sampler, 6);
    // Model the seat
    pushMatrix(modelMatrix);
    modelMatrix.translate(1+sofa_position/2, -1.55, -2.7);  // Translation
    modelMatrix.rotate(-90,0,1,0);
    modelMatrix.scale(2.8, 0.35, 0.9); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

    // Model the back
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 1, 0.5);  // Translation
    modelMatrix.scale(1, 3, 0.3); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);
    // Model arm 1
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.45, 1.2, 0);  // Translation
    modelMatrix.scale(0.05, 0.35, 0.75); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0.45, 1, -0.3);  // Translation
    modelMatrix.scale(0.05, 0.75, 0.15); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model arm 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45, 1.2, 0);  // Translation
    modelMatrix.scale(0.05, 0.35, 0.75); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45, 1, -0.3);  // Translation
    modelMatrix.scale(0.05, 0.75, 0.15); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model leg 1
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.4, -0.8, 0.56);  // Translation
    modelMatrix.scale(0.05, 1, 0.15); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model leg 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.4, -0.8, -0.43);  // Translation
    modelMatrix.scale(0.05, 1, 0.15); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model leg 3
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.4, -0.8, 0.56);  // Translation
    modelMatrix.scale(0.05, 1, 0.15); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model leg 4
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.4, -0.8, -0.43);  // Translation
    modelMatrix.scale(0.05, 1, 0.15); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    gl.activeTexture(gl.TEXTURE8);
    gl.uniform1i(u_Sampler, 8);
    //Model pillow 1
    //Model pillow 2
    
    modelMatrix = popMatrix();


    //Model an armchair
    gl.activeTexture(gl.TEXTURE6);
    gl.uniform1i(u_Sampler, 6);
    // Model the seat
    pushMatrix(modelMatrix);
    modelMatrix.translate(2, -1.55, 0.2);  // Translation
    modelMatrix.rotate(-45,0,1,0);
    modelMatrix.scale(0.9, 0.35, 0.9); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

    // Model the back
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 1, 0.5);  // Translation
    modelMatrix.scale(1, 3, 0.3); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);
    // Model arm 1
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.45, 1.2, 0);  // Translation
    modelMatrix.scale(0.1, 0.5, 0.75); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0.45, 1, -0.3);  // Translation
    modelMatrix.scale(0.1, 0.75, 0.15); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model arm 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45, 1.2, 0);  // Translation
    modelMatrix.scale(0.1, 0.5, 0.75); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45, 1, -0.3);  // Translation
    modelMatrix.scale(0.1, 0.75, 0.15); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model leg 1
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.4, -0.8, 0.56);  // Translation
    modelMatrix.scale(0.15, 1, 0.15); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model leg 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.4, -0.8, -0.43);  // Translation
    modelMatrix.scale(0.15, 1, 0.15); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model leg 3
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.4, -0.8, 0.56);  // Translation
    modelMatrix.scale(0.15, 1, 0.15); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model leg 4
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.4, -0.8, -0.43);  // Translation
    modelMatrix.scale(0.15, 1, 0.15); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    modelMatrix = popMatrix();

    //Model the armchair pillow
    gl.activeTexture(gl.TEXTURE8);
    gl.uniform1i(u_Sampler, 8);
    pushMatrix(modelMatrix);
    modelMatrix.translate(1.9, -1.1, 0.4); //Translation
    modelMatrix.rotate(-45,0,1,0);
    modelMatrix.rotate(15,1,0,0);
    modelMatrix.scale(0.55, 0.55, 0.1); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Model a side table
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);
    // Model the table surface
    pushMatrix(modelMatrix);
    modelMatrix.translate(1.15, -1.45, -0.4);  // Translation
    modelMatrix.rotate(-45,0,1,0);
    modelMatrix.scale(0.65, 0.05, 0.65); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    
    // Model the table leg 1
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45,-5,0.45);  // Translation
    modelMatrix.scale(0.08, 11, 0.08); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
    
    // Model the table leg 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.45,-5,0.45);  // Translation
    modelMatrix.scale(0.08, 11, 0.08); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
    
    // Model the table leg 3
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45,-5,-0.45);  // Translation
    modelMatrix.scale(0.08, 11, 0.08); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
    
    // Model the table leg 4
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.45,-5,-0.45);  // Translation
    modelMatrix.scale(0.08, 11, 0.08); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
    
    modelMatrix = popMatrix();

    //Model a bookshelf
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);
    //Model the base
    pushMatrix(modelMatrix);
    modelMatrix.translate(4.75, -1.95, 2.5);  // Translation
    modelMatrix.scale(0.4, 0.1, 1.25); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

    // Model panel 1
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 9.5, 0.48);  // Translation
    modelMatrix.scale(1, 20, 0.06); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model panel 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 9.5, -0.48);  // Translation
    modelMatrix.scale(1, 20, 0.06); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model top panel
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 19, 0);  // Translation
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model back panel
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.5, 10, 0);  // Translation
    modelMatrix.scale(0.06, 19, 1); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model shelves
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 15.5, 0);  // Translation
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 11.5, 0);  // Translation
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 7.5, 0);  // Translation
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 3.5, 0);  // Translation
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Model books 
    gl.activeTexture(gl.TEXTURE5);
    gl.uniform1i(u_Sampler, 5);
    
        pushMatrix(modelMatrix);
        modelMatrix.translate(-0.25-book_position/2, 5.5, 0);  // Translation
        modelMatrix.scale(0.5, 2.7, 0.05); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();
    
        pushMatrix(modelMatrix);
        modelMatrix.translate(-0.25, 5.5, 0.1);  // Translation
        modelMatrix.scale(0.5, 2.7, 0.05); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();
    
        pushMatrix(modelMatrix);
        modelMatrix.translate(-0.25-book_position/3, 9.5, 0.1);  // Translation
        modelMatrix.scale(0.5, 2.7, 0.05); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();
    
        pushMatrix(modelMatrix);
        modelMatrix.translate(-0.25, 17.5, 0.1);  // Translation
        modelMatrix.scale(0.5, 2.7, 0.05); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();
    
        pushMatrix(modelMatrix);
        modelMatrix.translate(-0.25, 17.5, 0.2);  // Translation
        modelMatrix.scale(0.5, 2.7, 0.05); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();
    
        pushMatrix(modelMatrix);
        modelMatrix.translate(-0.25-book_position/4, 13.5, -0.2);  // Translation
        modelMatrix.scale(0.5, 2.7, 0.05); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();
    
    modelMatrix = popMatrix();

    //Model a bookshelf 2
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);

    //Model the base
    pushMatrix(modelMatrix);
    modelMatrix.translate(4.75, -1.95, 1.0);  // Translation
    modelMatrix.scale(0.4, 0.1, 1.25); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

    // Model panel 1
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 9.5, 0.48);  // Translation
    modelMatrix.scale(1, 20, 0.06); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model panel 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 9.5, -0.48);  // Translation
    modelMatrix.scale(1, 20, 0.06); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model top panel
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 19, 0);  // Translation
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model back panel
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.5, 10, 0);  // Translation
    modelMatrix.scale(0.06, 19, 1); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model shelves
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 15.5, 0);  // Translation
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 11.5, 0);  // Translation
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 7.5, 0);  // Translation
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 3.5, 0);  // Translation
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Model books
    gl.activeTexture(gl.TEXTURE5);
    gl.uniform1i(u_Sampler, 5);

    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.25, 5.5, 0);  // Translation
    modelMatrix.scale(0.5, 2.7, 0.05); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.25-book_position/6, 5.5, 0.1);  // Translation
    modelMatrix.scale(0.5, 2.7, 0.05); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.25, 9.5, 0.1);  // Translation
    modelMatrix.scale(0.5, 2.7, 0.05); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.25, 13.5, -0.3);  // Translation
    modelMatrix.scale(0.5, 2.7, 0.05); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.25-book_position/4, 13.5, -0.4);  // Translation
    modelMatrix.scale(0.5, 2.7, 0.05); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.25-book_position/2, 13.5, -0.2);  // Translation
    modelMatrix.scale(0.5, 2.7, 0.05); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    modelMatrix = popMatrix();

    //Model a desk
    gl.activeTexture(gl.TEXTURE12);
    gl.uniform1i(u_Sampler, 12);

    //Model the table surface
    pushMatrix(modelMatrix);
    modelMatrix.translate(2.55, -1.1, 4.0);  // Translation
    modelMatrix.scale(2.65, 0.1, 1.0); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

    //Model the table legs
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.4,-4,-0.4);  // Translation
    modelMatrix.scale(0.05, 9, 0.1); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0.4,-4,0.4);  // Translation
    modelMatrix.scale(0.05, 9, 0.1); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Model a laptop
    gl.activeTexture(gl.TEXTURE13);
    gl.uniform1i(u_Sampler, 13);
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.2, 0.5, -0.1);  // Translation
    modelMatrix.scale(0.3, 0.11, 0.4); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    if(!OFFICE){ //laptop screen open

    pushMatrix(modelMatrix);
    modelMatrix.translate(0.2, 2,0.1);  // Translation
    modelMatrix.scale(0.3, 6, 0.05); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Laptop screen
    gl.activeTexture(gl.TEXTURE10);
    gl.uniform1i(u_Sampler, 10);
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.2, 2,0.05);  // Translation
    modelMatrix.scale(0.25, 5.5, 0.01); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
    } else { //laptop closed
        pushMatrix(modelMatrix);
    modelMatrix.translate(0.2, 1, -0.1);  // Translation
    modelMatrix.scale(0.3, 0.11, 0.4); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();
    }

    //Laptop keyboard
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.2, 0.55, -0.1);  // Translation
    modelMatrix.scale(0.2, 0.11, 0.2); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Model under-desk cabinet
    gl.activeTexture(gl.TEXTURE12);
    gl.uniform1i(u_Sampler, 12);

    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.48,-4,0);  // Translation
    modelMatrix.scale(0.03, 8.5, 1); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.18,-4,0);  // Translation
    modelMatrix.scale(0.03, 8.5, 1); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.33, -8, 0);  // Translation
    modelMatrix.scale(0.3, 0.1, 1.0); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Desk cabinet shelves

    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.33, -5.45, 0);  // Translation
    modelMatrix.scale(0.3, 0.15, 1.0); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.33, -3.05, 0);  // Translation
    modelMatrix.scale(0.3, 0.15, 1.0); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    modelMatrix = popMatrix();

    //Model an office chair
    gl.activeTexture(gl.TEXTURE4);
    gl.uniform1i(u_Sampler, 4);

    if(!OFFICE){
    // Model the chair seat
    pushMatrix(modelMatrix);
    modelMatrix.translate(3.1, -1.35, 3);  // Translation
    modelMatrix.rotate(250,0,1,0);
    modelMatrix.scale(0.7, 0.11, 0.7); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

    // Model the chair back
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45, 3, 0);  // Translation
    modelMatrix.scale(0.11, 6, 1); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);

    // Model the chair leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.0, -2.5, 0);  // Translation
    modelMatrix.scale(0.12, 4, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0.0, -4.25, 0);  // Translation
    modelMatrix.scale(0.95, 0.5, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0.0, -4.25, 0);  // Translation
    modelMatrix.scale(0.12, 0.5, 0.95); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Model the chair arms

    // Model arm 1
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.1, 2.5, -0.4);  // Translation
    modelMatrix.scale(0.7, 0.5, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0.2, 1.5, -0.4);  // Translation
    modelMatrix.scale(0.1, 2.5, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model arm 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.1, 2.5, 0.4);  // Translation
    modelMatrix.scale(0.7, 0.5, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0.2, 1.5, 0.4);  // Translation
    modelMatrix.scale(0.1, 2.5, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    modelMatrix = popMatrix()
    } else { //Slide the chair backwards

    // Model the chair seat
    pushMatrix(modelMatrix);
    modelMatrix.translate(3.1, -1.35, 2.5);  // Translation
    modelMatrix.rotate(250,0,1,0);
    modelMatrix.scale(0.7, 0.11, 0.7); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

    // Model the chair back
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.45, 3, 0);  // Translation
    modelMatrix.scale(0.11, 6, 1); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);

    // Model the chair leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.0, -2.5, 0);  // Translation
    modelMatrix.scale(0.12, 4, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0.0, -4.25, 0);  // Translation
    modelMatrix.scale(0.95, 0.5, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0.0, -4.25, 0);  // Translation
    modelMatrix.scale(0.12, 0.5, 0.95); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Model the chair arms

    // Model arm 1
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.1, 2.5, -0.4);  // Translation
    modelMatrix.scale(0.7, 0.5, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0.2, 1.5, -0.4);  // Translation
    modelMatrix.scale(0.1, 2.5, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    // Model arm 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.1, 2.5, 0.4);  // Translation
    modelMatrix.scale(0.7, 0.5, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0.2, 1.5, 0.4);  // Translation
    modelMatrix.scale(0.1, 2.5, 0.12); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    modelMatrix = popMatrix()
    }

    //Lamp base
    gl.activeTexture(gl.TEXTURE5);
    gl.uniform1i(u_Sampler, 5);

    pushMatrix(modelMatrix);
    modelMatrix.translate(1.15, -1.4, -0.4);  // Translation
    modelMatrix.rotate(-45,0,1,0);
    modelMatrix.scale(0.25, 0.05, 0.25); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 5, 0);  // Translation
    modelMatrix.scale(0.1, 8, 0.1); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Lamp shade
    gl.activeTexture(gl.TEXTURE4);
    gl.uniform1i(u_Sampler, 4);

    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 10, 0);  // Translation
    modelMatrix.scale(1, 2, 1); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 12, 0);  // Translation
    modelMatrix.scale(0.8, 2, 0.8); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 14, 0);  // Translation
    modelMatrix.scale(0.6, 2, 0.6); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    modelMatrix = popMatrix();

    //Model a floor lamp
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);

    pushMatrix(modelMatrix);
    modelMatrix.translate(0.8, -1.97, 3.95);  // Translation
    modelMatrix.scale(0.4, 0.05, 0.4); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 12, 0);  // Translation
    modelMatrix.scale(0.1, 25, 0.1); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Lamp shade
    gl.activeTexture(gl.TEXTURE3);
    gl.uniform1i(u_Sampler, 3);

    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 26, 0);  // Translation
    modelMatrix.scale(1, 3, 1); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 28, 0);  // Translation
    modelMatrix.scale(0.8, 2, 0.8); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    if(!DIRECTIONAL_LIGHTS){ //Illuminate when directional lights are on
        gl.activeTexture(gl.TEXTURE3);
        gl.uniform1i(u_Sampler, 3);
        } else {
            gl.uniform1i(u_UseTextures, 0);
            n = initVertexBuffers(gl, 255/255, 255/255, 102/255, 1);
    
        }

    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 30, 0);  // Translation
    modelMatrix.scale(0.6, 2, 0.6); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    modelMatrix = popMatrix();
    gl.uniform1i(u_UseTextures, 1);
    //Model the kitchen

    //Model tile flooring 
    gl.activeTexture(gl.TEXTURE11);
    gl.uniform1i(u_Sampler, 11);

    pushMatrix(modelMatrix);
    modelMatrix.translate(-2.85, -1.9, 2.6);  // Translation
    modelMatrix.scale(4.3, 0.01, 3.75); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Model the refrigerator
    gl.activeTexture(gl.TEXTURE13);
    gl.uniform1i(u_Sampler, 13);

    //Base
    pushMatrix(modelMatrix);
    modelMatrix.translate(-1.3, -1.9, 4);  // Translation
    modelMatrix.scale(1.25, 0.05, 1.0); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

    //Top
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 40, 0);  // Translation
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Back
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 19, 0.5);  // Translation
    modelMatrix.scale(1, 41, 0.05); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Left panel
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.5, 19, 0);  // Translation
    modelMatrix.scale(0.05, 41, 1); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Right panel
    pushMatrix(modelMatrix);
    modelMatrix.translate(-0.5, 19, 0);  // Translation
    modelMatrix.scale(0.05, 41, 1); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Door
    if(FRIDGE_DOOR){
        pushMatrix(modelMatrix);
        modelMatrix.translate(0.1, 19, -.85);  // Translation
        modelMatrix.rotate(-45, 0, 1, 0);
        modelMatrix.scale(1, 41, 0.05); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

        //Door handle
        gl.activeTexture(gl.TEXTURE2);
        gl.uniform1i(u_Sampler, 2);

        pushMatrix(modelMatrix);
        modelMatrix.translate(-0.4, 0, -0.5);  // Translation
        modelMatrix.scale(0.05, 0.4, 0.05); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix()
    }
    else {
        pushMatrix(modelMatrix);
        modelMatrix.translate(0, 19, -0.5);  // Translation
        modelMatrix.scale(1, 41, 0.05); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

        //Door handle
        gl.activeTexture(gl.TEXTURE2);
        gl.uniform1i(u_Sampler, 2);

        pushMatrix(modelMatrix);
        modelMatrix.translate(-0.4, 0, -0.5);  // Translation
        modelMatrix.scale(0.05, 0.4, 0.05); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix()
    }
    modelMatrix = popMatrix();

    modelMatrix = popMatrix();

    //Model the countertop
    gl.activeTexture(gl.TEXTURE1);
    gl.uniform1i(u_Sampler, 1);

    pushMatrix(modelMatrix);
    modelMatrix.translate(-3.5, -0.9, 4.0);  // Translation
    modelMatrix.scale(3.05, 0.05, 1.0); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

    //Model the stovetop
    gl.activeTexture(gl.TEXTURE5);
    gl.uniform1i(u_Sampler, 5);

    pushMatrix(modelMatrix);
    modelMatrix.translate(0.1, 1, 0);  // Translation
    modelMatrix.scale(0.4, 0.5, 0.8); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Gas burner 1
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.2, 1.1, 0.15);  // Translation
    modelMatrix.scale(0.1, 1, 0.2); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Gas burner 2
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.2, 1.1, -0.15);  // Translation
    modelMatrix.scale(0.1, 1, 0.2); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Gas burner 3
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 1.1, 0.15);  // Translation
    modelMatrix.scale(0.1, 1, 0.2); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Gas burner 4
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 1.1, -0.15);  // Translation
    modelMatrix.scale(0.1, 1, 0.2); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    modelMatrix = popMatrix();

    gl.activeTexture(gl.TEXTURE1);
    gl.uniform1i(u_Sampler, 1);
    pushMatrix(modelMatrix);
    modelMatrix.translate(-4.52, -0.9, 2.25);  // Translation
    modelMatrix.scale(1.0, 0.05, 2.75); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

    //Model the sink
    gl.activeTexture(gl.TEXTURE13);
    gl.uniform1i(u_Sampler, 13);
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.1, 1, 0.2);  // Translation
    modelMatrix.scale(0.4, 0.5, 0.3); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);
    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 1.1, 0.2);  // Translation
    modelMatrix.scale(0.08, 9, 0.02); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 1.1, 0.15);  // Translation
    modelMatrix.scale(0.08, 3, 0.02); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(0, 1.1, 0.25);  // Translation
    modelMatrix.scale(0.08, 3, 0.02); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    modelMatrix = popMatrix();

    //Model the cabinets under counter
    gl.activeTexture(gl.TEXTURE2);
    gl.uniform1i(u_Sampler, 2);

    pushMatrix(modelMatrix);
    modelMatrix.translate(-3.5, -1.5, 4.0);  // Translation
    modelMatrix.scale(3.05,1, 1.0); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    pushMatrix(modelMatrix);
    modelMatrix.translate(-4.52, -1.5, 2.25);  // Translation
    modelMatrix.scale(1.0, 1, 2.75); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    //Model the bar stand
    gl.activeTexture(gl.TEXTURE12);
    gl.uniform1i(u_Sampler, 12);
    pushMatrix(modelMatrix);
    modelMatrix.translate(-3.5, -0.8, 1.3);  // Translation
    modelMatrix.scale(3.5, 0.05, 0.8); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

    //Model the stand leg
    pushMatrix(modelMatrix);
    modelMatrix.translate(0.45,-11,0);  // Translation
    modelMatrix.scale(0.02, 22, 0.3); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
    modelMatrix = popMatrix();

    modelMatrix = popMatrix();

    //Model a bar stool
    gl.activeTexture(gl.TEXTURE8);
    gl.uniform1i(u_Sampler, 8);

    if(!BAR_STOOL){
    // Model the chair seat
    pushMatrix(modelMatrix);
    modelMatrix.translate(-2.4, -1, 0.4);  // Translation
    modelMatrix.scale(0.5, 0.11, 0.5); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

        gl.activeTexture(gl.TEXTURE2);
        gl.uniform1i(u_Sampler, 2);

        // Model the chair leg 1
        pushMatrix(modelMatrix);
        modelMatrix.translate(0.45, -3.5, -0.45);  // Translation
        modelMatrix.scale(0.12, 8, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();

        // Model the chair leg 2
        pushMatrix(modelMatrix);
        modelMatrix.translate(-0.45, -3.5, 0.45);  // Translation
        modelMatrix.scale(0.12, 8, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();

        // Model the chair leg 3
        pushMatrix(modelMatrix);
        modelMatrix.translate(-0.45, -3.5, -0.45);  // Translation
        modelMatrix.scale(0.12, 8, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();

        // Model the chair leg 4
        pushMatrix(modelMatrix);
        modelMatrix.translate(0.45, -3.5, 0.45);  // Translation
        modelMatrix.scale(0.12, 8, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();
    modelMatrix = popMatrix();

    } else { //Animate the bar stool to slide outwards
    pushMatrix(modelMatrix);
    modelMatrix.translate(-2.4, -1, 0);  // Translation
    modelMatrix.scale(0.5, 0.11, 0.5); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

        gl.activeTexture(gl.TEXTURE2);
        gl.uniform1i(u_Sampler, 2);

        // Model the chair leg 1
        pushMatrix(modelMatrix);
        modelMatrix.translate(0.45, -3.5, -0.45);  // Translation
        modelMatrix.scale(0.12, 8, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();

        // Model the chair leg 2
        pushMatrix(modelMatrix);
        modelMatrix.translate(-0.45, -3.5, 0.45);  // Translation
        modelMatrix.scale(0.12, 8, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();

        // Model the chair leg 3
        pushMatrix(modelMatrix);
        modelMatrix.translate(-0.45, -3.5, -0.45);  // Translation
        modelMatrix.scale(0.12, 8, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();

        // Model the chair leg 4
        pushMatrix(modelMatrix);
        modelMatrix.translate(0.45, -3.5, 0.45);  // Translation
        modelMatrix.scale(0.12, 8, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();
    modelMatrix = popMatrix();

    }
    //Model a bar stool 2
    gl.activeTexture(gl.TEXTURE8);
    gl.uniform1i(u_Sampler, 8);
    if(!BAR_STOOL){
    // Model the chair seat
    pushMatrix(modelMatrix);
    modelMatrix.translate(-3.3, -1, 0.4);  // Translation
    //modelMatrix.rotate(45,0,1,0);
    modelMatrix.scale(0.5, 0.11, 0.5); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

        gl.activeTexture(gl.TEXTURE2);
        gl.uniform1i(u_Sampler, 2);

        // Model the chair leg 1
        pushMatrix(modelMatrix);
        modelMatrix.translate(0.45, -3.5, -0.45);  // Translation
        modelMatrix.scale(0.12, 8, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();

        // Model the chair leg 2
        pushMatrix(modelMatrix);
        modelMatrix.translate(-0.45, -3.5, 0.45);  // Translation
        modelMatrix.scale(0.12, 8, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();

        // Model the chair leg 3
        pushMatrix(modelMatrix);
        modelMatrix.translate(-0.45, -3.5, -0.45);  // Translation
        modelMatrix.scale(0.12, 8, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();

        // Model the chair leg 4
        pushMatrix(modelMatrix);
        modelMatrix.translate(0.45, -3.5, 0.45);  // Translation
        modelMatrix.scale(0.12, 8, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();
    modelMatrix = popMatrix();

    } else { //Animate the bar stool to slide out and rotate
    // Model the chair seat
    pushMatrix(modelMatrix);
    modelMatrix.translate(-3.3, -1, 0.2);  // Translation
    modelMatrix.rotate(45,0,1,0);
    modelMatrix.scale(0.5, 0.11, 0.5); // Scale
    drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);

        gl.activeTexture(gl.TEXTURE2);
        gl.uniform1i(u_Sampler, 2);

        // Model the chair leg 1
        pushMatrix(modelMatrix);
        modelMatrix.translate(0.45, -3.5, -0.45);  // Translation
        modelMatrix.scale(0.12, 8, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();

        // Model the chair leg 2
        pushMatrix(modelMatrix);
        modelMatrix.translate(-0.45, -3.5, 0.45);  // Translation
        modelMatrix.scale(0.12, 8, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();

        // Model the chair leg 3
        pushMatrix(modelMatrix);
        modelMatrix.translate(-0.45, -3.5, -0.45);  // Translation
        modelMatrix.scale(0.12, 8, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();

        // Model the chair leg 4
        pushMatrix(modelMatrix);
        modelMatrix.translate(0.45, -3.5, 0.45);  // Translation
        modelMatrix.scale(0.12, 8, 0.12); // Scale
        drawCube(gl, u_ModelMatrix, u_NormalMatrix, n);
        modelMatrix = popMatrix();
    modelMatrix = popMatrix();
    }

    }

function drawCube(gl, u_ModelMatrix, u_NormalMatrix, n) {
    pushMatrix(modelMatrix);
     // Pass the model matrix to the uniform variable
    gl.uniformMatrix4fv(u_ModelMatrix, false, modelMatrix.elements);
    // Calculate the normal transformation matrix and pass it to u_NormalMatrix
    normalMatrix.setInverseOf(modelMatrix);
    normalMatrix.transpose();
    gl.uniformMatrix4fv(u_NormalMatrix, false, normalMatrix.elements);
    // Draw the cube
    gl.drawElements(gl.TRIANGLES, n, gl.UNSIGNED_BYTE, 0);
    modelMatrix = popMatrix();
}

//Import a texture file
function importText(gl, tex, textureIndex) {
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, 1);
    gl.activeTexture(textureIndex);
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, tex.image);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, tex.image);
}

function initArrayBuffer(gl, attribute, data, num, type) {
    // Create a buffer object
    let buffer = gl.createBuffer();
    if (!buffer) {
        console.log('Failed to create the buffer object');
        return false;
    }
    // Write date into the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
    // Assign the buffer object to the attribute variable
    let a_attribute = gl.getAttribLocation(gl.program, attribute);
    if (a_attribute < 0) {
        console.log('Failed to get the storage location of ' + attribute);
        return false;
    }
    gl.vertexAttribPointer(a_attribute, num, type, false, 0, 0);
    gl.enableVertexAttribArray(a_attribute);

    gl.bindBuffer(gl.ARRAY_BUFFER, null);
    return true;
}

function initVertexBuffers(gl, r, g, b, a) {
    // Create a cube
    //    v6----- v5
    //   /|      /|
    //  v1------v0|
    //  | |     | |
    //  | |v7---|-|v4
    //  |/      |/
    //  v2------v3
    let vertices = new Float32Array([   // Coordinates
        0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, 0.5, // v0-v1-v2-v3 front
        0.5, 0.5, 0.5, 0.5, -0.5, 0.5, 0.5, -0.5, -0.5, 0.5, 0.5, -0.5, // v0-v3-v4-v5 right
        0.5, 0.5, 0.5, 0.5, 0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, 0.5, // v0-v5-v6-v1 up
        -0.5, 0.5, 0.5, -0.5, 0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, // v1-v6-v7-v2 left
        -0.5, -0.5, -0.5, 0.5, -0.5, -0.5, 0.5, -0.5, 0.5, -0.5, -0.5, 0.5, // v7-v4-v3-v2 down
        0.5, -0.5, -0.5, -0.5, -0.5, -0.5, -0.5, 0.5, -0.5, 0.5, 0.5, -0.5  // v4-v7-v6-v5 back
    ]);


    let colors = new Float32Array([    // Colors
        r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a,  // v0-v1-v2-v3 front
        r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a,     // v0-v3-v4-v5 right
        r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a,     // v0-v5-v6-v1 up
        r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a,    // v1-v6-v7-v2 left
        r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a,    // v7-v4-v3-v2 down
        r, g, b, a, r, g, b, a, r, g, b, a, r, g, b, a     // v4-v7-v6-v5 back
    ]);


    let normal = new Float32Array([    // Normal
        0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0,  // v0-v1-v2-v3 front
        1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0,  // v0-v3-v4-v5 right
        0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,  // v0-v5-v6-v1 up
        -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0,  // v1-v6-v7-v2 left
        0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0,  // v7-v4-v3-v2 down
        0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0, 0.0, 0.0, -1.0   // v4-v7-v6-v5 back
    ]);

    // Texture Coordinates
    let TextureCoords = new Float32Array([
        1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,  // v0-v1-v2-v3 front
        0.0, 1.0, 0.0, 0.0, 1.0, 0.0, 1.0, 1.0,  // v0-v3-v4-v5 right
        1.0, 0.0, 1.0, 1.0, 0.0, 1.0, 0.0, 0.0,  // v0-v5-v6-v1 up
        1.0, 1.0, 0.0, 1.0, 0.0, 0.0, 1.0, 0.0,  // v1-v6-v7-v2 left
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0,  // v7-v4-v3-v2 down
        0.0, 0.0, 1.0, 0.0, 1.0, 1.0, 0.0, 1.0   // v4-v7-v6-v5 back
    ]);

    // Indices of the vertices
    let indices = new Uint8Array([
        0, 1, 2, 0, 2, 3,    // front
        4, 5, 6, 4, 6, 7,    // right
        8, 9, 10, 8, 10, 11,    // up
        12, 13, 14, 12, 14, 15,    // left
        16, 17, 18, 16, 18, 19,    // down
        20, 21, 22, 20, 22, 23     // back
    ]);

    if (!initArrayBuffer(gl, 'a_Position', vertices, 3, gl.FLOAT)) return -1;
    if (!initArrayBuffer(gl, 'a_Color', colors, 4, gl.FLOAT)) return -1;
    if (!initArrayBuffer(gl, 'a_Normal', normal, 3, gl.FLOAT)) return -1;
    if (!initArrayBuffer(gl, 'a_TextureCoords', TextureCoords, 2, gl.FLOAT)) return -1;

    // Unbind the buffer object
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // Write the indices to the buffer object
    let indexBuffer = gl.createBuffer();
    if (!indexBuffer) {
        console.log('Failed to create the buffer object');
        return false;
    }

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, indexBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indices, gl.STATIC_DRAW);

    return indices.length;
}

}

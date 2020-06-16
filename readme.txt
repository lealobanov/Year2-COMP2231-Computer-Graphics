
In order to render the 3D model with texturing enabled, a local server must be started.

To start the server:

- Navigate to the directory containing the 3D model files (index.html, index.js) and lib/textures folders

- Type 'python3 -m http.server'
	- If Python 3 is the default version of Python on the current machine,typing 'python -m http.server' will suffice
	- A server deploying the 3D model will be started on port 8000. It can be accessed by opening a browser (preferably Google Chrome) and typing localhost:8000

- Alternatively, you can deploy a local server by navigating to the directory containing program files and typing 'http-server' in the command prompt. This will start a local server deployment on port 8080.

If this is the first time loading the program, please wait for a few seconds to allow all texture files to load and render properly. See the attached reference final_render.png for an image of the model when properly deployed.

Navigation Instructions

W - Move Camera Position Forwards
S - Move Camera Position Backwards
A - Move Camera Position Left
D - Move Camera Position Right
T - Move Camera Position Up
G - Move Camera Position Down
Up/down arrows - Rotate model horizontally
Left/right arrows - Rotate model vertically

Lighting, Animations Instructions

1 - Change Ambient Lighting State, On/Dimmed
2 - Turn Directional Lighting On/Off
3 - Move Office Chair, Laptop
4 - Open/Close Fridge Door
5 - Move Bar Stools
6 - Move Dining Chairs
7 - Move Dining Chairs 2
8 - Move Rug Across Room
9 - Move Books In/Out Shelves
0 - Move Sofa Across Room
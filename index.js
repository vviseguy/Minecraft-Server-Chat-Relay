const { exec } = require('child_process');
const readline = require('readline');
const WebSocket = require('ws');

let lastError = null;

// minecraft server
let minecraftServer;
let isMinecraftServerActive = false;
startMinecraftServer();

// websocket server
let wss;
let isWebsocketOnline = false;
startWebsocket();

let currentClient = null;

//ssh server
let isSSHTunnelActive = false;
startSSHTunel();

// a rough set up for asychronomous commands that must be execued in order
let currentTimeout = null;
let currentFunction = null;
let functionStack = [];
///////////////////////////////////////////////////////////////////////////

const boring_server_jargon = /^\[.*\]: (?:\[Not Secure\] )?(.*)/;

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
});
  
rl.on('line', (input) => {
    let command;
    let params;
    [command, params] =  parseWord(input);
    try{
        switch (command){
            case "do":
                minecraftServer.stdin.write(`${params}\n`);
                break;
            case "say":
            case "tellraw":
                params.replace("\\","\\\\");
                params.replace("\"","\\\"");
                minecraftServer.stdin.write(`/tellraw @a {"text":"${params}"}\n`);
                break;
            case "op":
                minecraftServer.stdin.write(`${input}\n`);
                break;
            case "echo":
                process.stdout.write(`${params}\n`);
                break;
            case "clear":
                clearFunctStack();
            break;
            case "close":
            case "stop":
                minecraftServer.stdin.write(`stop\n`);
                break;
            case "restart":
                pushFunctStack(() => {minecraftServer.stdin.write(`stop\n`);}, () => isMinecraftServerActive);
                pushFunctStack(() => {startMinecraftServer()});
                handleFunctStack();
                break;
            case "start":
                startMinecraftServer();
                break;
            case "status":
                process.stdout.write("#### STATUS ################################\n");
                process.stdout.write(`Websocket active? ${isWebsocketOnline}\n`);
                process.stdout.write(`Minecraft server active? ${isMinecraftServerActive}\n`);
                process.stdout.write(`Function Stack length ${functionStack.length}\n`);
                process.stdout.write(`Function Stack timeout active? ${currentTimeout !== null}\n`);
                process.stdout.write(`Function Stack function set? ${currentFunction !== null}\n`);
                process.stdout.write("############################################\n");
                break;
            case "debug":
                [command, params] =  parseWord(params);
                switch (command){
                    case "server":
                        console.log("<< Debug report for minecraft server >>");
                        console.log(minecraftServer);
                        console.log("<<<<<<<<<<<<<<<<<<<>>>>>>>>>>>>>>>>>>>>");
                        break;
                    case "socket":
                        console.log("<< Debug report for socket >>");
                        console.log(wss);
                        console.log("<<<<<<<<<<<<<<>>>>>>>>>>>>>>>");
                        break;
                    case "error":
                        if (lastError == null) {
                            console.log("No recorded error.");
                            break;
                        }
                        console.log("<< Printing last error >>");
                        console.log(lastError);
                        console.log("<<<<<<<<<<<<>>>>>>>>>>>>>");
                        break;
                    case "status":
                        process.stdout.write(`Minecraft server active? ${isMinecraftServerActive}\n`);
                        break;
                    default:
                        process.stdout.write(`Unknown command: ${input}\n`);
                }
                break;
            case "ssh":
                [command, params] =  parseWord(params);
                switch (command){
                    case "stop":
                        console.log("Um idk how to do that yet");
                        isSSHTunnelActive = false;
                        break;
                    case "start":
                        startSSHTunel();
                        break;
                    default:
                        process.stdout.write(`Unknown command: ${input}\n`);
                }
                break;
            case "socket":
            case "websocket":
                    [command, params] =  parseWord(params);
                    switch (command){
                        case "stop":
                        case "close":
                            if (isWebsocketOnline) wss.close();
                            if (params === "force") {
                                wss.terminate();
                                wss = null;
                                currentClient = null;
                                isWebsocketOnline = false;
                            }
                            break;
                        case "restart":
                            pushFunctStack(() => {wss.close()},             () => isWebsocketOnline);
                            pushFunctStack(() => {startWebsocket(command)});
                            handleFunctStack();
                            break;
                        case "start":
                            [command, params] =  parseWord(params);
                            startWebsocket(command);
                            break;
                        case "status":
                            process.stdout.write(`Websocket active? ${isWebsocketOnline}\n`);
                            process.stdout.write(`Has Client? ${currentClient !== null}\n`);
                            
                            break;
                        default:
                            process.stdout.write(`Unknown command: ${input}\n`);
                    }
                    break;
            case "regex":
                const boring_server = /^\[.*\]: (.*)/;
                console.log(params.match(boring_server_jargon)[1]);
                break;
            case "quit":
                pushFunctStack(() => {minecraftServer.stdin.write(`stop\n`);}, () => isMinecraftServerActive);
                pushFunctStack(() => {wss.close()},                            () => isWebsocketOnline);
                pushFunctStack(() => {process.exit()});
                handleFunctStack();
                break;
            default:
                process.stdout.write(`Unknown command: ${input}\n`);
        }
        
    } catch (e) {
        lastError = e;
        
        clearFunctStack();
        console.log('Error handling input.\nPrint "debug error" for the full report.');
    }
});
function parseWord(str){
    let word = str || "";
    let rest = null;

    if (word.indexOf(' ') > -1){
        word = str.substring(0, str.indexOf(' '));
        rest = str.substring(str.indexOf(' ') + 1);
    }

    return [word, rest];
}

function startMinecraftServer(){
    if (isMinecraftServerActive) {
        console.log("Error: Server is already running!");
        clearFunctStack();
        return;
    }
    try{
        minecraftServer = exec('cd ./server; java -Xmx1024M -Xms1024M -jar server.jar nogui');
        isMinecraftServerActive = true;

        minecraftServer.stdout.on('data', (data) => {
            let str = data.toString().replace("\n","\n] ");
            
            
            if (str.match(boring_server_jargon)) {
                str = str.match(boring_server_jargon)[1];
                if (str === "No player was found") return;
                process.stdout.write("][] "+str+"\n");
            }
            else {
                process.stdout.write("] "+str+"\n");
            }
        
            if (currentClient && currentClient.readyState === WebSocket.OPEN) {
                if (str === "No player was found"){
                    return;
                }
                currentClient.send(str);
            }
        });
        
        minecraftServer.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });
        
        minecraftServer.on('close', (code) => {
            isMinecraftServerActive = false;
            console.log(`child process exited with code ${code}`);
            currentClient = null;
            handleFunctStack();
        });
        return;
    }
    catch (e) {
        console.log("Error stating minecraft server. Type 'debug error' for the complete report");
        clearFunctStack();
        lastError = e;
        return;
    }
} 

function startSSHTunel(){
    if (isSSHTunnelActive) {
        console.log("Error: SSH Tunnel is already running!");
        clearFunctStack();
        return;
    }
    try{
        minecraftServer = exec('start /b putty.exe -load "wiseguy.click"');
        isSSHTunnelActive = true;
    }
    catch (e) {
        console.log("Error stating minecraft server. Type 'debug error' for the complete report");
        clearFunctStack();
        lastError = e;
        return;
    }
} 

function startWebsocket(port){
    if (isWebsocketOnline) {
        console.log("Error: Websocket is already running!");
        clearFunctStack();
        return;
    }



    let serverPort = 25566;
    port = parseInt(port);
    if (port > 0) {
        serverPort = port;
    }
    console.log(`Starting the websocket on port ${serverPort}`);
    try{
        wss = new WebSocket.Server({ port: serverPort });
        isWebsocketOnline = true;

        wss.on('connection', (client) => {
            if (currentClient) {
                console.log('Rejecting connection, another client is already connected');
                client.close();
                return;
            }
            currentClient = client;
            console.log('WebSocket client connected!');
            client.on('message', (message) => {
                message = message.toString();
                process.stdout.write("| "+message+"\n");
                message.replace("\\","\\\\");
                message.replace("\"","\\\"");
                if (isMinecraftServerActive)
                    minecraftServer.stdin.write(`/tellraw @a {"text":"${message}"}\n`);
                
            });

            client.on('close', () => {
                console.log('WebSocket client disconnected');
                currentClient = null;
            });
        });

        wss.on('close', (code) => {
            isWebsocketOnline = false;
            console.log("Websocket sucessfullly closed");
            handleFunctStack();
        });
    }
    catch (e){
        lastError = e;
        clearFunctStack();
        console.log('Error: Could not load the websocket server.\nPrint "debug error" for the full report.');
    }

}


function handleFunctStack(){
    if (currentTimeout != null) {

        clearTimeout(currentTimeout);
        currentTimeout = null;
        currentFunction();

        return;
    }
    if (functionStack.length > 0){
        let [funct, test] = functionStack.splice(0, 1)[0];
        if (test == undefined || test == null) return funct();

        const doFunct = (maxTries, count = 0) => {
            if (count >= maxTries) {
                console.log('Error endless loop detected. Type "debug error" for the full report');
                lastError = new Error(`handleFunctStack: Ran the following function ${count} times:\n\r${funct}`);
                clearFunctStack();
                return;
            }
            funct();
            if (test()) {
                currentFunction = () => {
                    currentFunction = null;
                    currentTimeout = null;
                    if (test()) doFunct(maxTries, count+1);
                    else handleFunctStack();
                }
                currentTimeout = setTimeout(currentFunction, 5000);
            }
            else handleFunctStack();
        }

        // try to do the function 10 times, checking that the basic condition was met
        doFunct(10);
    }
}

function pushFunctStack(funct, test){
    functionStack.push([funct, test]);
}

function clearFunctStack(){
    functionStack = [];
    clearTimeout(currentTimeout);
    currentTimeout = null;
    currentFunction = null;
}

function getFunctStackLen(){
    return functionStack.length;
}


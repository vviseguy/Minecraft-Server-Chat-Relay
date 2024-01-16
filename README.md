This project interfaces with my [minecraft-ssh-webserver](https://github.com/vviseguy/minecraft-ssh-webserver).

## Docs:
The terminal interface provides options for interacting with the ssh tunnel, the websocket that exists through it, and the minecraft server.
This terminal includes functionality for the following commands:

```clear``` - Clears the in-program call stack. This has the effect of stopping certain types of long-running commands.

```debug <options>``` - Get debug info. The following are availiable options:
 - ```error``` - Print the full message of the most revent error.
 - ```server``` - Get debug information from the Minecraft Server.
 - ```socket``` - Get debug information about the websocket to the webserver.
 - ```status``` - Prints the status of the various connected programs.

```do [command]``` - Run in game commands.

```echo [params]``` - Echo to the terminal.

```op [params]``` - Run the ```op``` command.

```quit``` - Attempts to politely close all the connected programs. Uses a call stack.

```restart``` - Restart the minecraft server. Uses a call stack.

```say|tellraw [message]``` - Send message to all players.

```socket|websocket <command>``` - Interact with the websocket. The following are availiable commands:
 - ```restart``` - Restarts the websocket. Uses a call stack.
 - ```start [port]``` - Starts the websocket. The optional port parameter specifies which port of the server to connect to. Defaults to 25566.
 - ```status``` - Prints status information related to the websocket.
 - ```stop|close [force]``` - Attempts to close the websocket tunnel. When the ```force``` option is present, the socket is forcefully closed.

```ssh <command>``` - Interact with the SSH tunnel. The SSH tunnel is managed by PuTTY with a saved session called "wiseguy.click" (an allusion to how the [webserver](https://github.com/vviseguy/minecraft-ssh-webserver) was originally hosted). The following are availiable commands:
 - ```start``` - Attempts to start a new SSH tunnel with putty.
 - ```stop|close``` - Attempts to stop the SSH tunnel. [NOT YET WORKING]: manually close the putty session and run this command.

```start``` - Start the Minecraft Server.

```status``` - Gives detailed status info for all parts of the Chat Relay program.

```stop|close``` - Stop the Minecraft Server.

## Todo: 
- Add diagrams to show layout/explain how these servers integrate.

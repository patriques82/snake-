window.onload = function() {

    //event helper for keeping track of keypress states
    //credit to http://nokarma.org/2011/02/27/javascript-game-development-keyboard-input/index.html
    var Key = {
        _pressed_: {},
        LEFT: 37,
        UP: 38,
        RIGHT: 39,
        DOWN: 40,

        isDown: function(keyCode) {
            return this._pressed_[keyCode];
        },

        onKeydown: function(event) {
            this._pressed_[event.keyCode] = true;
        },

        onKeyup: function(event) {
            delete this._pressed_[event.keyCode];
        },
    };

    var Player = {
        ctx: null,
        bodysize: 0,
        image: null,
        body: [], //empty array for all body parts
        head: [0, 0],
        tail: [0, 0],
        direction: { NONE: 0, UP: 1, RIGHT: 2, DOWN: 3, LEFT: 4 },
        current_dir: 2,
        collision: false,

        init: function(context, x, y, tilesize, bodyimage) {
            this.ctx = context;
            this.head[0] = x;
            this.head[1] = y;
            this.cellsize = tilesize;
            this.bodysize = tilesize - 2;
            this.image = bodyimage;
        },

        turn_up: function() {
            this.current_dir = this.direction.UP;
        },

        turn_right: function() {
            this.current_dir = this.direction.RIGHT;
        },

        turn_down: function() {
            this.current_dir = this.direction.DOWN;
        },

        turn_left: function() {
            this.current_dir = this.direction.LEFT;
        },

        //if gameobject gets out of borders wraparound
        border_control: function() {
            if(this.head[0] === -1 && this.current_dir === this.direction.LEFT)
                this.head[0] = Game.size - 1;
            if(this.head[0] === Game.size && this.current_dir === this.direction.RIGHT)
                this.head[0] = 0;
            if(this.head[1] === -1 && this.current_dir === this.direction.UP)
                this.head[1] = Game.size - 1;
            if(this.head[1] === Game.size && this.current_dir === this.direction.DOWN)
                this.head[1] = 0;
        },

        move: function() {
            var bodylength = this.body.length;
            if(bodylength > 0) {
                this.tail[0] = this.body[bodylength - 1][0]; //remember last position for growth
                this.tail[1] = this.body[bodylength - 1][1];
                for(var i = bodylength - 1; i > 0; i--) {
                    this.body[i][0] = this.body[i-1][0];
                    this.body[i][1] = this.body[i-1][1];
                }
                this.body[0][0] = this.head[0];
                this.body[0][1] = this.head[1];
            } else {
                this.tail[0] = this.head[0];
                this.tail[1] = this.head[1];
            }
            switch (this.current_dir) {
                case this.direction.UP:
                    this.head[1] -= 1;
                    break;
                case this.direction.RIGHT:
                    this.head[0] += 1;
                    break;
                case this.direction.DOWN:
                    this.head[1] += 1;
                    break;
                case this.direction.LEFT:
                    this.head[0] -= 1;
                    break;
            }
            this.check_self_collision();
            this.border_control();
        },

        check_self_collision: function() {
            if(this.body.length > 2) {
                for(var i = 0; i < this.body.length - 1; i++) {
                    if(this.body[i][0] === this.head[0] && this.body[i][1] === this.head[1]) {
                        this.collision = true;
                    }
                }
            }
        },

        //let player move only in current and pendicular directions, not in opposite directions
        update: function() {
            if(Key.isDown(Key.UP) && this.current_dir !== this.direction.DOWN) this.turn_up();
            if(Key.isDown(Key.RIGHT) && this.current_dir !== this.direction.LEFT) this.turn_right();
            if(Key.isDown(Key.DOWN) && this.current_dir !== this.direction.UP) this.turn_down();
            if(Key.isDown(Key.LEFT) && this.current_dir !== this.direction.RIGHT) this.turn_left();
            this.move();
        },

        //x and y of apple
        eats_apple: function(x, y) {
            return this.head[0] === x && this.head[1] === y;
        },

        //add stored previous position of tail
        add_tail: function() {
            this.body.push(new Array(this.tail[0], this.tail[1])); //new Array object => no reference conflicts 
        },

        draw: function() {
            this.ctx.drawImage(this.image,
                               (this.head[0] * this.cellsize + 1), // x
                               (this.head[1] * this.cellsize + 1), // y
                               this.bodysize, this.bodysize); // scale x and y
            for(var i = 0; i < this.body.length; i++) { //draw the body of gameobject
                this.ctx.drawImage(this.image,
                                   (this.body[i][0] * this.cellsize + 1),
                                   (this.body[i][1] * this.cellsize + 1),
                                   this.bodysize, this.bodysize);
            }
        }
    };

	var Game = {
		screen: document.getElementById("winscreen"),
		ctx: document.getElementById("winscreen").getContext("2d"),
		tilesize: 0, //cell in game
		size: 30, //nr of cells in rows and cols (size * size), default 30
        mid: 15,
        fps: 0,
        interID: 0,
		greenball: new Image(),
		redball: new Image(),
        redball_xpos: undefined,
        redball_ypos: undefined,

		//arguments: size => (size * size), fps => (frames per second)
		config: function(size, fps) {
			this.size = size;
            this.fps = fps;
            this.mid = Math.floor(size/2);
		},

		init: function() {
			this.ctx.strokeStyle = "#eee";
			this.tilesize = Math.floor(this.screen.width/this.size);
			this.greenball.src = "images/green_ball.png";
			this.redball.src = "images/red_ball.png"; 
			this.draw_gameboard();
            Player.init(this.ctx, this.mid, this.mid, this.tilesize, this.greenball);
		},

        gameover: function() {
            clearInterval(this.interID);
        },

        //update apples position only if passed arguments are undefined
        draw_apple: function(x, y) {
            var x_pos, y_pos;
            if (isNaN(x) && isNaN(y)) {
                //set apple in the diagonal quadrant from snake with origin in middle of screen
                var x_bottom = ((Player.head[0] > this.mid && Player.current_dir !== Player.direction.LEFT) ? 0 : this.mid);
                var y_bottom = ((Player.head[1] > this.mid  && Player.current_dir !== Player.direction.UP) ? 0 : this.mid);
                x_pos = Math.floor((Math.random() * this.mid) + x_bottom);
                y_pos = Math.floor((Math.random() * this.mid) + y_bottom);
            } else {
                x_pos = x;
                y_pos = y;
            }
            this.redball_xpos = x_pos; //keep old positions or update
            this.redball_ypos = y_pos;
            this.ctx.drawImage(this.redball,
                               (x_pos * this.tilesize + 1), //x
                               (y_pos * this.tilesize + 1), //y
                               this.tilesize - 2, this.tilesize - 2); //scale x, y
        },

		//draw horisontal and vertical lines
		draw_gameboard: function() {
			//horisontal
			for(var y = 0; y < this.screen.height; y += this.tilesize) {
				this.ctx.moveTo(0, y);
				this.ctx.lineTo(this.screen.width, y);
			}
			//vertical
			for(var x = 0; x < this.screen.width; x += this.tilesize) {
				this.ctx.moveTo(x, 0);
				this.ctx.lineTo(x, this.screen.height);
			}
			this.ctx.stroke();
		},

        //delete old state and draw new gamestate
        draw: function() {
            this.ctx.clearRect(0, 0, this.screen.width, this.screen.height);
            this.draw_gameboard();
            Player.draw();
            this.draw_apple(this.redball_xpos, this.redball_ypos);
        },

        //update gamestate and objects
        update: function() {
            Player.update();
            if(Player.eats_apple(this.redball_xpos, this.redball_ypos)) {
                this.redball_xpos = undefined;
                this.redball_ypos = undefined;
                Player.add_tail();
            }
            if(Player.collision) {
                this.gameover();
            }
        }
	};

    //keeping track of keypress for controlling snake
    window.addEventListener('keydown', function(event) { Key.onKeydown(event); }, false);
    window.addEventListener('keyup', function(event) { Key.onKeyup(event); }, false);
    Game.run = function() {
        Game.interID = setInterval(function() {
                Game.draw();
                Game.update();
            }, Math.floor(1000/Game.fps));
    };
    Game.config(20, 6); //size, fps
    Game.init();
    Game.run();
};


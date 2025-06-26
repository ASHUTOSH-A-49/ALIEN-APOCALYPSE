
(() => {
  const gamediv = document.getElementById('gamediv');
  const strtdiv = document.getElementById('strtdiv');
  const gameover = document.getElementById('over');
  const startButton = document.getElementById('strtbtn');
  const restartButton = document.getElementById('restartButton');
  const canvas = document.querySelector('#game');
  const c = canvas.getContext('2d');

  const LOGICAL_WIDTH = 1024;
  const LOGICAL_HEIGHT = 576;
  const ASPECT_RATIO = LOGICAL_WIDTH / LOGICAL_HEIGHT;

  let game, player, projectiles, grids, alienProjectiles, particles, keys, abilities;
  let frames, randinterval, abilityTimer, abilitySpawnInterval;

  startButton.addEventListener('click', () => {
    gamediv.style.display = 'block';
    strtdiv.style.display = 'none';
    initGame();
  });

  restartButton.addEventListener('click', () => {
    gameover.style.display = "none";
    initGame();
  });

  function resizeCanvas() {
    const containerWidth = window.innerWidth;
    const containerHeight = window.innerHeight;
    let scaleWidth = containerWidth;
    let scaleHeight = containerWidth / ASPECT_RATIO;
    if(scaleHeight > containerHeight * 0.95) {
      scaleHeight = containerHeight * 0.95;
      scaleWidth = scaleHeight * ASPECT_RATIO;
    }
    canvas.style.width = scaleWidth + 'px';
    canvas.style.height = scaleHeight + 'px';
  }

  class Player {
  constructor() {
    this.velocity = { x: 0, y: 0 };
    this.rotation = 0;
    this.opacity = 1;
    this.image = new Image();
    this.image.src = './assets/spaceship.png';
    this.width = 0;
    this.height = 0;
    this.position = {
      x: LOGICAL_WIDTH / 2,
      y: LOGICAL_HEIGHT - 100
    };
    this.ready = false;
    this.isShielded = false;
    this.shieldExpireTime = 0;
    this.isDoubleFire = false;
    this.doubleFireExpireTime = 0;

    this.image.onload = () => {
      const scale = 0.2;
      this.width = this.image.width * scale;
      this.height = this.image.height * scale;
      this.position.x = LOGICAL_WIDTH / 2 - this.width / 2;
      this.position.y = LOGICAL_HEIGHT - this.height - 40;
      this.ready = true;
    };
    
  }

  draw() {
    if (!this.ready) return;
    c.save();
    c.globalAlpha = this.opacity;
    c.translate(this.position.x + this.width / 2, this.position.y + this.height / 2);
    c.rotate(this.rotation);
    c.translate(-this.position.x - this.width / 2, -this.position.y - this.height / 2);

    // Draw shield as a greenish circle if shield is active
    if (this.isShielded) {
      const bubbleSize = Math.max(this.width, this.height) * 1.6;
      c.beginPath();
      c.arc(this.position.x + this.width / 2, this.position.y + this.height / 2, bubbleSize / 2, 0, Math.PI * 2);
      c.fillStyle = 'rgba(82, 255, 38, 0.3)'; // Greenish color with low transparency
      c.fill();
      c.closePath();
    }

    c.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);
    c.restore();
  }

  update() {
    if (!this.ready) return;
    this.position.x += this.velocity.x;
    if (this.position.x < 0) this.position.x = 0;
    if (this.position.x + this.width > LOGICAL_WIDTH) this.position.x = LOGICAL_WIDTH - this.width;
    this.draw();
  }

  shoot() {
    const velocity = { x: 0, y: -5 };
    if (this.isDoubleFire) {
      projectiles.push(new Projectile({
        position: { x: this.position.x + this.width / 2 - 10, y: this.position.y },
        velocity
      }));
      projectiles.push(new Projectile({
        position: { x: this.position.x + this.width / 2 + 10, y: this.position.y },
        velocity
      }));
    } else {
      projectiles.push(new Projectile({
        position: { x: this.position.x + this.width / 2, y: this.position.y },
        velocity
      }));
    }
  }
}


  class Projectile {
    constructor({position, velocity}) {
      this.position = {...position};
      this.velocity = {...velocity};
      this.radius = 4;
    }
    draw() {
      c.beginPath();
      c.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
      c.fillStyle = 'yellow';
      c.fill();
      c.closePath();
    }
    update() {
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      this.draw();
    }
  }

  class Particle {
    constructor({position, velocity, radius, color, fades}) {
      this.position = {...position};
      this.velocity = {...velocity};
      this.radius = radius;
      this.color = color;
      this.opacity = 1;
      this.fades = fades;
    }
    draw() {
      c.save();
      c.globalAlpha = this.opacity;
      c.beginPath();
      c.arc(this.position.x, this.position.y, this.radius, 0, Math.PI * 2);
      c.fillStyle = this.color;
      c.fill();
      c.closePath();
      c.restore();
    }
    update() {
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      if(this.fades) this.opacity -= 0.01;
      this.draw();
    }
  }

  class Alien {
    constructor({position}) {
      this.velocity = {x: 0, y: 0};
      this.image = new Image();
      this.image.src = './assets/invader.png';
      this.width = 0;
      this.height = 0;
      this.position = {...position};
      this.ready = false;
      this.image.onload = () => {
        const scale = 1;
        this.width = this.image.width * scale;
        this.height = this.image.height * scale;
        this.ready = true;
      };
    }
    draw() {
      if(!this.ready) return;
      c.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);
    }
    update({velocity}) {
      if(!this.ready) return;
      this.position.x += velocity.x;
      this.position.y += velocity.y;
      this.draw();
    }
    shoot(alienProjectiles) {
      alienProjectiles.push(new AlienProjectile({
        position: {
          x: this.position.x + this.width / 2,
          y: this.position.y + this.height
        },
        velocity: { x: 0, y: 5 }
      }));
    }
  }

  class Grid {
    constructor() {
      this.position = {x: 0, y: 0};
      this.velocity = {x: 5, y: 0};
      this.aliens = [];
      const columns = Math.floor(Math.random() * 6 + 5);
      const maxRows = Math.min(4, Math.floor(LOGICAL_HEIGHT / 150));
      const rows = Math.floor(Math.random() * maxRows + 1);
      this.width = columns * 30;
      for(let x = 0; x < columns; x++) {
        for(let y = 0; y < rows; y++) {
          this.aliens.push(new Alien({
            position: { x: x * 30, y: y * 30 }
          }));
        }
      }
    }
    update() {
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      this.velocity.y = 0;
      if(this.position.x + this.width >= LOGICAL_WIDTH || this.position.x < 0) {
        this.velocity.x = -this.velocity.x;
        this.velocity.y = 30;
      }
    }
  }

  class AlienProjectile {
    constructor({position, velocity}) {
      this.position = {...position};
      this.velocity = {...velocity};
      this.width = 5;
      this.height = 17;
    }
    draw() {
      c.fillStyle = 'red';
      c.fillRect(this.position.x, this.position.y, this.width, this.height);
    }
    update() {
      this.position.x += this.velocity.x;
      this.position.y += this.velocity.y;
      this.draw();
    }
  }

  class Ability {
    constructor({ position, type }) {
      this.position = position;
      this.velocity = { x: 0, y: 2 }; // Constant speed downward
      this.width = 30;
      this.height = 30;
      this.type = type;
      this.image = new Image();
      this.image.src = `./assets/${type}.png`;
      this.ready = false;
      this.image.onload = () => {
        this.ready = true;
      };
    }
    draw() {
      if (!this.ready) return;
      c.drawImage(this.image, this.position.x, this.position.y, this.width, this.height);
    }
    update() {
      this.position.y += this.velocity.y;
      this.draw();
    }
  }

  function updateLivesDisplay() {
    const livesContainer = document.getElementById('lives');
    livesContainer.innerHTML = '';
    for (let i = 0; i < game.lives; i++) {
      const lifeImage = document.createElement('img');
      lifeImage.src = './assets/lives.png';
      lifeImage.alt = 'Life';
      lifeImage.style.width = '30px';
      lifeImage.style.height = 'auto';
      livesContainer.appendChild(lifeImage);
    }
  }

  function spawnAbility() {
    const types = ['heart', 'shield', 'doublefire'];
    const type = types[Math.floor(Math.random() * types.length)];
    abilities.push(new Ability({
      position: { x: Math.random() * (LOGICAL_WIDTH - 30), y: -30 },
      type: type
    }));
  }

  function updateAbilities() {
  const now = Date.now();
  abilities.forEach((ability, index) => {
    ability.update();

    if (ability.position.y > LOGICAL_HEIGHT + ability.height) {
      abilities.splice(index, 1);
      return;
    }

    // Collision check with player
    if (ability.position.y + ability.height >= player.position.y &&
        ability.position.x + ability.width >= player.position.x &&
        ability.position.x <= player.position.x + player.width) {
      
      if (ability.type === 'heart') {
        if (game.lives < 3) {
          game.lives++;
          updateLivesDisplay();
        }
      } else if (ability.type === 'shield') {
        const duration = 7000; // 7 seconds in ms
        const newExpire = now + duration;

        if (player.isShielded && player.shieldExpireTime > now) {
          // Extend current shield time
          player.shieldExpireTime += duration;
        } else {
          player.isShielded = true;
          player.shieldExpireTime = newExpire;
        }
      } else if (ability.type === 'doublefire') {
        const duration = 10000; // 10 seconds in ms
        const newExpire = now + duration;

        if (player.isDoubleFire && player.doubleFireExpireTime > now) {
          // Extend current double fire time
          player.doubleFireExpireTime += duration;
        } else {
          player.isDoubleFire = true;
          player.doubleFireExpireTime = newExpire;
        }
      }

      abilities.splice(index, 1);
    }
  });
}
   


  function initGame() {
    projectiles = [];
    grids = [];
    alienProjectiles = [];
    particles = [];
    abilities = [];
    keys = { a: {pressed: false}, d: {pressed: false}, space: {pressed: false} };
    frames = 0;
    randinterval = Math.floor(Math.random() * 300 + 300);

    abilityTimer = 0;
    abilitySpawnInterval = Math.floor(Math.random() * 4000 + 8000);

    game = { over: false, active: true, lives: 3, score: 0 };
    updateLivesDisplay();

    player = new Player();

    for(let i = 0; i < 100; i++) {
      particles.push(new Particle({
        position: { x: Math.random() * LOGICAL_WIDTH, y: Math.random() * LOGICAL_HEIGHT },
        velocity: { x: 0, y: 1 },
        radius: Math.random() * 3,
        color: 'white'
      }));
    }

    resizeCanvas();
    setupControls();
    animate();
  }

  function animate() {
    if(!game.active) return;
    requestAnimationFrame(animate);

    c.clearRect(0,0,canvas.width, canvas.height);
    c.resetTransform();

    player.update();

    const now = Date.now();
  // Check shield expiration
  if (player.isShielded && player.shieldExpireTime <= now) {
    player.isShielded = false;
  }
  // Check double fire expiration
  if (player.isDoubleFire && player.doubleFireExpireTime <= now) {
    player.isDoubleFire = false;
  }

    // Update abilities and spawn them randomly
    updateAbilities();

    abilityTimer += 1000 / 60; // Estimate increment per frame (~16.6ms)
    if(abilityTimer >= abilitySpawnInterval){
      spawnAbility();
      abilityTimer = 0;
      abilitySpawnInterval = Math.floor(Math.random() * 4000 + 8000);
    }

    particles.forEach((particle, i) => {
      if(particle.position.y - particle.radius >= LOGICAL_HEIGHT){
        particle.position.x = Math.random() * LOGICAL_WIDTH;
        particle.position.y = -particle.radius;
      }
      if(particle.opacity <= 0.1){
        setTimeout(() => { particles.splice(i, 1); }, 0);
      } else {
        particle.update();
      }
    });

    alienProjectiles.forEach((alienProjectile, index) => {
      if (alienProjectile.position.y > LOGICAL_HEIGHT + alienProjectile.height) {
        setTimeout(() => {
            alienProjectiles.splice(index, 1);
        }, 0);
      } else {
        alienProjectile.update();
      }

      // Player collision with alien projectiles with shield logic
      if(alienProjectile.position.y + alienProjectile.height >= player.position.y &&
          alienProjectile.position.x + alienProjectile.width >= player.position.x &&
          alienProjectile.position.x <= player.position.x + player.width) {
        if(!player.isShielded){
          const damageAudio = document.getElementById("livesmp3");
          if(damageAudio){
            damageAudio.currentTime = 0;
            damageAudio.play().catch(err => console.warn("Audio autoplay issue:", err));
          }
          alienProjectiles.splice(index, 1);
          game.lives--;
          updateLivesDisplay();
          createParticles({object: player, color: 'white', fades: true});

          if(game.lives === 0) {
            setTimeout(() => {
              const blastAudio = document.getElementById("gameovermp3");
              if(blastAudio){
                blastAudio.currentTime = 0;
                blastAudio.play().catch(err => console.warn("Audio autoplay issue:", err));
              }
              player.opacity = 0;
              game.over = true;
            }, 0);
            setTimeout(() => {
              game.active = false;
              gameover.style.display = "block";
              document.getElementById('overscore').textContent = game.score;
              if(game.score >= localStorage.getItem('hs')){
                localStorage.setItem('hs', game.score);
              }
              document.getElementById('highscore').textContent = localStorage.getItem('hs') || 0;
            }, 1000);
          }
        } else {
          // Shielded - just remove the projectile silently
          alienProjectiles.splice(index, 1);
        }
      }
    });

    projectiles.forEach((projectile, index) => {
      if(projectile.position.y + projectile.radius <= 0){
        setTimeout(() => { projectiles.splice(index, 1); }, 0);
      } else {
        projectile.update();
      }
    });

    grids.forEach((grid, gridIndex) => {
      grid.update();

      if(frames % 50 === 0 && grid.aliens.length > 0){
        grid.aliens[Math.floor(Math.random() * grid.aliens.length)].shoot(alienProjectiles);
      }

      grid.aliens.forEach((alien, i) => {
        alien.update({velocity: grid.velocity});
        projectiles.forEach((projectile, j) => {
          if(projectile.position.y - projectile.radius <= alien.position.y + alien.height && projectile.position.x + projectile.radius >= alien.position.x &&
             projectile.position.x - projectile.radius <= alien.position.x + alien.width && projectile.position.y + projectile.radius >= alien.position.y) {
            setTimeout(() => {
              const alienFound = grid.aliens.find(a => a === alien);
              const projectileFound = projectiles.find(p => p === projectile);
              if(alienFound && projectileFound){
                game.score += 100;
                document.getElementById('score').textContent = game.score;
                createParticles({object: alien, color: 'purple', fades: true});
                grid.aliens.splice(i, 1);
                projectiles.splice(j, 1);

                if(grid.aliens.length > 0){
                  const FirstAlien = grid.aliens[0];
                  const LastAlien = grid.aliens[grid.aliens.length - 1];
                  grid.width = LastAlien.position.x - FirstAlien.position.x + LastAlien.width;
                } else {
                  grids.splice(gridIndex, 1);
                }
              }
            }, 0);
          }
        });
      });
    });

    if(keys.a.pressed && player.position.x > 0){
      player.velocity.x = -10;
      player.rotation = -0.15;
    } else if(keys.d.pressed && player.position.x + player.width < LOGICAL_WIDTH){
      player.velocity.x = 10;
      player.rotation = 0.15;
    } else {
      player.velocity.x = 0;
      player.rotation = 0;
    }

    if(frames % randinterval === 0){
      grids.push(new Grid());
      randinterval = Math.floor(Math.random() * 500 + 100);
      frames = 0;
    }
    frames++;
  }

  function createParticles({object, color, fades}) {
    for(let i = 0; i < 15; i++){
      particles.push(new Particle({
        position: { x: object.position.x + object.width / 2, y: object.position.y + object.height / 2 },
        velocity: { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2},
        radius: Math.random() * 3,
        color: color || 'purple',
        fades: fades
      }));
    }
  }

  let touchStartX = null;

  function setupControls() {
    window.addEventListener('keydown', ({key}) => {
      if(game.over) return;
      switch(key){
        case 'a': keys.a.pressed = true; break;
        case 'd': keys.d.pressed = true; break;
        case ' ':
          player.shoot();
          break;
      }
    });
    window.addEventListener('keyup', ({key}) => {
      switch(key){
        case 'a': keys.a.pressed = false; break;
        case 'd': keys.d.pressed = false; break;
      }
    });
    window.addEventListener('click', () => {
      if(game.over) return;
      const shootAudio = document.getElementById("shootmp3");
      if(shootAudio){
        shootAudio.currentTime = 0;
        shootAudio.play().catch(err => console.warn("Audio autoplay issue:", err));
      }
      player.shoot();
    });
    let autoFireInterval = null;

    window.addEventListener('touchstart', (event) => {
      if(game.over) return;

      const touch = event.touches[0];
      touchStartX = touch.clientX;

      const shootProjectile = () => {
          const shootAudio = document.getElementById("shootmp3");
          if(shootAudio){
              shootAudio.currentTime = 0;
              shootAudio.play().catch(err => console.warn("Audio autoplay issue:", err));
          }
          player.shoot();
      };

      shootProjectile();

      if(autoFireInterval) clearInterval(autoFireInterval);
      autoFireInterval = setInterval(() => {
          if(game.over){
              clearInterval(autoFireInterval);
              autoFireInterval = null;
              return;
          }
          shootProjectile();
      }, 200);
    });

    window.addEventListener('touchend', () => {
      keys.a.pressed = false;
      keys.d.pressed = false;
      if(autoFireInterval){
          clearInterval(autoFireInterval);
          autoFireInterval = null;
      }
    });

    window.addEventListener('touchcancel', () => {
      keys.a.pressed = false;
      keys.d.pressed = false;
      if(autoFireInterval){
          clearInterval(autoFireInterval);
          autoFireInterval = null;
      }
    });

    window.addEventListener('touchmove', (event) => {
      const touch = event.touches[0];
      const touchEndX = touch.clientX;
      if(touchEndX < touchStartX && player.position.x > 0){
        keys.a.pressed = true;
        keys.d.pressed = false;
      } else if(touchEndX > touchStartX && player.position.x + player.width < LOGICAL_WIDTH){
        keys.d.pressed = true;
        keys.a.pressed = false;
      }
    });
    
    window.addEventListener('resize', () => {
      resizeCanvas();
    });
    window.addEventListener('orientationchange', () => {
      setTimeout(() => resizeCanvas(), 300);
    });
  }
})();


import React, { useEffect, useMemo, useRef, useState } from "react";

const WRONG_LIMIT = 4;
const MAX_HP = 100;
const WRONG_ANSWER_PENALTY = 25;
const PROJECTILE_SPEED = 18;
const SCALE = 4;

export default function Shooter({ questions: externalQuestions = null, title: gameTitle = null }) {
	const canvasRef = useRef(null);
	const rafRef = useRef(0);
	const projectileRef = useRef(null);
	const keysRef = useRef({ left: false, right: false });
	const acceptingAnswerRef = useRef(false);

	const [playerHP, setPlayerHP] = useState(MAX_HP);
	const [monsterHP, setMonsterHP] = useState(MAX_HP);
	const [wrongAnswers, setWrongAnswers] = useState(0);
	const [correctAnswers, setCorrectAnswers] = useState(0);
	const [qIndex, setQIndex] = useState(0);
	const [started, setStarted] = useState(false);
	const [overlay, setOverlay] = useState({ open: false, title: "", msg: "", victory: false });

	// Player movement + idle sway
	const [playerBaseX, setPlayerBaseX] = useState(70);
	const playerYRef = useRef(0);
	const playerBoundsRef = useRef({ min: 40, max: 360 }); // max set later after canvas mounts

	// Floating text
	const floatRef = useRef({ active: false, text: "", x: 0, y: 0, color: "#fff", start: 0, duration: 650 });

	// Questions
	const questions = useMemo(
		() => {
			if (Array.isArray(externalQuestions) && externalQuestions.length > 0) {
				// Use questions passed from parent as-is (already ordered)
				return externalQuestions;
			}
			return shuffle([
				{ question: "Which of the following best defines force?", options: ["A push or pull", "Energy stored in an object", "Rate of change of work", "A form of heat"], answer: "A push or pull" },
				{ question: "Which of these is NOT an effect of force?", options: ["Changing the mass of an object", "Changing the shape of an object", "Changing the speed of an object", "Changing the direction of motion"], answer: "Changing the mass of an object" },
				{ question: "Which is a contact force?", options: ["Frictional force", "Magnetic force", "Gravitational force", "Electrostatic force"], answer: "Frictional force" },
				{ question: "Which is a non-contact force?", options: ["Muscular force", "Frictional force", "Normal reaction", "Magnetic force"], answer: "Magnetic force" },
				{ question: "SI unit of force is:", options: ["Joule", "Newton", "Pascal", "Watt"], answer: "Newton" },
				{ question: "A force can change the ______ of an object.", options: ["Color", "Mass", "State of motion", "Temperature only"], answer: "State of motion" },
				{ question: "When two forces act in the same direction on an object, the net force is:", options: ["The difference of the two forces", "Zero", "The sum of the two forces", "Always equal to the larger force"], answer: "The sum of the two forces" },
				{ question: "Balanced forces on a body:", options: ["Change the state of motion", "Change the shape only", "Produce acceleration", "Do not change the state of motion"], answer: "Do not change the state of motion" },
				{ question: "Unbalanced forces acting on a body can:", options: ["Keep it at rest forever", "Only change shape", "Cause a change in speed or direction", "Only reduce its mass"], answer: "Cause a change in speed or direction" },
				{ question: "Which instrument is commonly used to measure force?", options: ["Spring balance", "Thermometer", "Voltmeter", "Barometer"], answer: "Spring balance" },
				{ question: "Gravitational force acts between:", options: ["Only between Earth and Moon", "Only between charged bodies", "Any two masses", "Only between magnets"], answer: "Any two masses" },
				{ question: "Which force opposes the relative motion between surfaces in contact?", options: ["Electrostatic force", "Frictional force", "Magnetic force", "Gravitational force"], answer: "Frictional force" },
				{ question: "Muscular force is an example of:", options: ["Non-contact force", "Contact force", "Field force", "Nuclear force"], answer: "Contact force" },
				{ question: "The direction of force is important because force is a:", options: ["Scalar quantity", "Vector quantity", "Dimensionless quantity", "Unitless quantity"], answer: "Vector quantity" },
				{ question: "Pushing a door to open it is an example of:", options: ["Gravitational force", "Magnetic force", "Applied force", "Electrostatic force"], answer: "Applied force" }
			]);
		},
		[externalQuestions]
	);

	// Canvas + world
	const world = useMemo(
		() => ({ width: 800, height: 360, groundY: 300 }),
		[]
	);

	// Setup canvas and listeners
	useEffect(() => {
		const canvas = canvasRef.current;
		const ctx = canvas.getContext("2d");
		playerYRef.current = world.groundY - 22 * SCALE;
		playerBoundsRef.current = { min: 40, max: world.width / 2 - 40 };

		const onKeyDown = (e) => {
			if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keysRef.current.left = true;
			if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keysRef.current.right = true;
		};
		const onKeyUp = (e) => {
			if (e.key === "ArrowLeft" || e.key === "a" || e.key === "A") keysRef.current.left = false;
			if (e.key === "ArrowRight" || e.key === "d" || e.key === "D") keysRef.current.right = false;
		};
		window.addEventListener("keydown", onKeyDown);
		window.addEventListener("keyup", onKeyUp);

		const loop = () => {
			updatePlayerMovement();
			drawScene(ctx);
			rafRef.current = requestAnimationFrame(loop);
		};
		rafRef.current = requestAnimationFrame(loop);

		return () => {
			cancelAnimationFrame(rafRef.current);
			window.removeEventListener("keydown", onKeyDown);
			window.removeEventListener("keyup", onKeyUp);
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, []);

	// Helpers: drawing
	function shuffle(arr) {
		const a = arr.slice();
		for (let i = a.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[a[i], a[j]] = [a[j], a[i]];
		}
		return a;
	}

	function getMonsterHoverOffset() {
		return Math.sin(performance.now() * 0.004) * 10;
	}

	function drawTopUI(ctx) {
		const pad = 16;
		const topY = 10;
		const barW = 240;
		const barH = 16;

		drawHPBar(ctx, pad + barW / 2, topY, playerHP, MAX_HP, barW, barH, true, "#47d96c", "#2ac17e", "#64ffd2");
		ctx.font = "bold 14px monospace";
		ctx.fillStyle = "#cfeff6";
		ctx.textAlign = "left";
		ctx.fillText("PLAYER", pad, topY + barH + 16);

		const rightCenter = world.width - pad - barW / 2;
		drawHPBar(ctx, rightCenter, topY, monsterHP, MAX_HP, barW, barH, false, "#ff7a7a", "#ff3e3e", "#ffb3b3");
		ctx.textAlign = "right";
		ctx.fillStyle = "#ffd6e0";
		ctx.fillText("MONSTER", world.width - pad, topY + barH + 16);

		const currentQ = Math.min(Math.max(qIndex === 0 ? 1 : qIndex, 1), 10);
		const centerText = currentQ + "/10";
		ctx.textAlign = "center";
		ctx.font = "bold 22px monospace";
		ctx.strokeStyle = "rgba(0,0,0,.6)";
		ctx.lineWidth = 3;
		ctx.strokeText(centerText, world.width / 2, topY + barH + 14);
		ctx.fillStyle = "#ffeaa7";
		ctx.fillText(centerText, world.width / 2, topY + barH + 14);
	}

	function drawHPBar(ctx, centerX, topY, current, max, barWidth, barHeight, fillFromLeft, colorA, colorB, frameColor) {
		const pct = Math.max(0, Math.min(1, current / max));
		const half = barWidth / 2;
		ctx.fillStyle = "rgba(0,0,0,.55)";
		ctx.fillRect(centerX - half - 3, topY - 3, barWidth + 6, barHeight + 6);
		ctx.strokeStyle = frameColor || "rgba(255,255,255,.35)";
		ctx.lineWidth = 2;
		ctx.strokeRect(centerX - half - 3, topY - 3, barWidth + 6, barHeight + 6);
		ctx.fillStyle = "rgba(20,24,54,.9)";
		ctx.fillRect(centerX - half, topY, barWidth, barHeight);
		const fillW = barWidth * pct;
		const grad = ctx.createLinearGradient(centerX - half, topY, centerX + half, topY);
		grad.addColorStop(0, colorA);
		grad.addColorStop(1, colorB);
		ctx.fillStyle = grad;
		if (fillFromLeft) ctx.fillRect(centerX - half, topY, fillW, barHeight);
		else ctx.fillRect(centerX + half - fillW, topY, fillW, barHeight);
	}

	function getPlayerPixelsFancy() {
		// Thicker-legs Contra-style commando (same as your last version)
		const c = {
			skin: "#f1c08a", shadow: "#d8a971", hair: "#ffcc33", headband: "#c43131", eye: "#2a2a2a",
			shirt: "#dddddd", shirtShadow: "#bdbdbd", strap: "#5b4636", ammo: "#f4d03f",
			gun: "#bfc7d9", gunDark: "#8e97ad", cigar: "#5a3b2a", cigarTip: "#ff6b3b",
			glove: "#2f2f38", pant: "#3d3f7a", pantShade: "#34366a", boot: "#2b2e4a", bootShade: "#242741"
		};
		const px = [];
		for (let y = 0; y < 10; y++) for (let x = 2; x < 12; x++) px.push({ x, y, color: y >= 8 ? c.shadow : c.skin });
		for (let x = 2; x < 12; x++) px.push({ x, y: 0, color: c.hair });
		for (let x = 3; x < 11; x++) px.push({ x, y: 1, color: c.hair });
		for (let y = 2; y < 4; y++) for (let x = 2; x < 12; x++) px.push({ x, y, color: c.headband });
		px.push({ x: 5, y: 5, color: c.eye }); px.push({ x: 8, y: 5, color: c.eye });
		for (let x = 12; x < 14; x++) px.push({ x, y: 7, color: c.cigar });
		px.push({ x: 14, y: 7, color: c.cigarTip });
		for (let x = 6; x < 8; x++) px.push({ x, y: 10, color: c.shadow });
		for (let y = 11; y < 19; y++) for (let x = 1; x < 13; x++) px.push({ x, y, color: (x === 1 || x === 12) ? c.shirtShadow : c.shirt });
		for (let y = 12; y < 16; y++) for (let x = -1; x < 1; x++) px.push({ x, y, color: c.skin });
		for (let y = 16; y < 18; y++) for (let x = -2; x < 0; x++) px.push({ x, y, color: c.skin });
		for (let y = 12; y < 16; y++) for (let x = 13; x < 15; x++) px.push({ x, y, color: c.skin });
		for (let y = 16; y < 18; y++) for (let x = 15; x < 17; x++) px.push({ x, y, color: c.skin });
		for (let y = 18; y < 19; y++) for (let x = -2; x < 0; x++) px.push({ x, y, color: c.glove });
		for (let y = 18; y < 19; y++) for (let x = 15; x < 17; x++) px.push({ x, y, color: c.glove });
		for (let i = 0; i < 6; i++) { const ax = 2 + i * 2; const ay = 11 + i; px.push({ x: ax, y: ay, color: c.ammo }); px.push({ x: ax + 1, y: ay, color: c.ammo }); }
		for (let y = 11; y < 19; y++) px.push({ x: 7, y, color: "#5b4636" });
		for (let y = 19; y < 25; y++) {
			for (let x = 0; x < 7; x++) px.push({ x, y, color: (x === 0 ? c.pantShade : c.pant) });
			px.push({ x: 7, y, color: c.pantShade });
			for (let x = 8; x < 15; x++) px.push({ x, y, color: (x === 14 ? c.pantShade : c.pant) });
		}
		for (let y = 25; y < 28; y++) {
			for (let x = -1; x < 7; x++) px.push({ x, y, color: (x <= 0 ? c.bootShade : c.boot) });
			for (let x = 8; x < 16; x++) px.push({ x, y, color: (x >= 15 ? c.bootShade : c.boot) });
		}
		for (let y = 15; y < 18; y++) for (let x = 10; x < 20; x++) px.push({ x, y, color: c.gun });
		for (let y = 16; y < 17; y++) for (let x = 10; x < 20; x++) px.push({ x, y, color: c.gunDark });
		for (let y = 15; y < 17; y++) for (let x = 20; x < 24; x++) px.push({ x, y, color: c.gunDark });
		for (let x = 24; x < 26; x++) px.push({ x, y: 16, color: "#e6eefc" });
		return px;
	}

	function getMonsterPixelsFancy() {
		const c = { bodyTop: "#9a7bff", bodyMid: "#7b5cff", bodyBot: "#5e46d1", belly: "#b9a8ff", eye: "#ffffff", pupil: "#ff3355", horn: "#ffd166", claw: "#e6e6ff", wing: "#bca7ff" };
		const px = [];
		for (let y = 0; y < 14; y++) for (let x = 0; x < 16; x++) px.push({ x, y, color: y < 5 ? c.bodyTop : y < 10 ? c.bodyMid : c.bodyBot });
		for (let y = 5; y < 12; y++) for (let x = 5; x < 11; x++) px.push({ x, y, color: c.belly });
		for (let y = 3; y < 5; y++) for (let x = 4; x < 6; x++) px.push({ x, y, color: c.eye });
		for (let y = 3; y < 5; y++) for (let x = 10; x < 12; x++) px.push({ x, y, color: c.eye });
		px.push({ x: 5, y: 4, color: c.pupil }); px.push({ x: 11, y: 4, color: c.pupil });
		for (let y = -2; y < 0; y++) for (let x = 2; x < 4; x++) px.push({ x, y, color: c.horn });
		for (let y = -2; y < 0; y++) for (let x = 12; x < 14; x++) px.push({ x, y, color: c.horn });
		for (let y = 14; y < 16; y++) for (let x = 0; x < 2; x++) px.push({ x, y, color: c.claw });
		for (let y = 14; y < 16; y++) for (let x = 14; x < 16; x++) px.push({ x, y, color: c.claw });
		for (let y = 6; y < 10; y++) for (let x = -2; x < 0; x++) px.push({ x, y, color: c.wing });
		for (let y = 6; y < 10; y++) for (let x = 18; x < 20; x++) px.push({ x, y, color: c.wing });
		return px;
	}

	function drawSpriteWithOutline(ctx, pixels, originX, originY, scale, outlineColor = "rgba(0,0,0,0.6)") {
		const offsets = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];
		for (const [ox, oy] of offsets) for (const p of pixels) {
			ctx.fillStyle = outlineColor;
			ctx.fillRect(originX + (p.x * scale) + ox, originY + (p.y * scale) + oy, scale, scale);
		}
		for (const p of pixels) {
			ctx.fillStyle = p.color;
			ctx.fillRect(originX + p.x * scale, originY + p.y * scale, scale, scale);
		}
	}

	function drawBackground(ctx) {
		const grad = ctx.createLinearGradient(0, 0, 0, world.height);
		grad.addColorStop(0, "#111643");
		grad.addColorStop(0.6, "#0d1231");
		grad.addColorStop(1, "#090b1f");
		ctx.fillStyle = grad;
		ctx.fillRect(0, 0, world.width, world.height);

		ctx.fillStyle = "rgba(255,255,255,.08)";
		for (let i = 0; i < 70; i++) {
			const x = (i * 229) % world.width;
			const y = (i * 137) % 180;
			ctx.fillRect(x, y, 2, 2);
		}
		ctx.beginPath();
		ctx.fillStyle = "#fff6c4";
		ctx.arc(80, 70, 22, 0, Math.PI * 2);
		ctx.fill();

		function hill(y, color, amp, freq, phase) {
			ctx.fillStyle = color;
			ctx.beginPath();
			ctx.moveTo(0, world.height);
			for (let x = 0; x <= world.width; x += 6) {
				const h = y + Math.sin((x + phase) * freq) * amp;
				ctx.lineTo(x, h);
			}
			ctx.lineTo(world.width, world.height);
			ctx.closePath();
			ctx.fill();
		}
		hill(world.groundY - 40, "#0f1433", 12, 0.016, 0);
		hill(world.groundY - 20, "#12183c", 16, 0.02, 120);

		ctx.fillStyle = "#151a3e";
		ctx.fillRect(0, world.groundY, world.width, 60);
		ctx.fillStyle = "#1d2352";
		for (let i = 0; i < world.width; i += 12) ctx.fillRect(i, world.groundY, 6, 4);
	}

	function renderProjectile(ctx, p) {
		if (!p) return;
		if (p.kind === "bullet") {
			ctx.save();
			ctx.globalAlpha = 0.95;
			ctx.shadowColor = p.color;
			ctx.shadowBlur = 14;
			ctx.fillStyle = p.color;
			ctx.fillRect(p.x, p.y, p.w, p.h);
			ctx.beginPath();
			ctx.moveTo(p.x + p.w, p.y);
			ctx.lineTo(p.x + p.w + 6, p.y + p.h / 2);
			ctx.lineTo(p.x + p.w, p.y + p.h);
			ctx.closePath();
			ctx.fill();
			if (p.flash) {
				ctx.globalAlpha = 0.7;
				ctx.beginPath();
				ctx.arc(p.flash.x, p.flash.y, 10, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.restore();
		} else {
			ctx.save();
			for (let i = 0; i < p.tail.length; i++) {
				const seg = p.tail[i];
				const age = Math.max(0, Math.min(1, (performance.now() - seg.t) / 250));
				const r = (12 - i) * 0.7;
				const g = ctx.createRadialGradient(seg.x, seg.y, 0, seg.x, seg.y, r);
				g.addColorStop(0, "rgba(255,230,140," + (0.25 * (1 - age)) + ")");
				g.addColorStop(1, "rgba(255,120,60,0)");
				ctx.fillStyle = g;
				ctx.beginPath();
				ctx.arc(seg.x, seg.y, r, 0, Math.PI * 2);
				ctx.fill();
			}
			const flicker = 2 + Math.sin(performance.now() * 0.03) * 2;
			const R = 12 + flicker;
			const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, R);
			grad.addColorStop(0, "#fff6a0");
			grad.addColorStop(0.45, "#ffb04d");
			grad.addColorStop(1, "rgba(255,80,40,0)");
			ctx.fillStyle = grad;
			ctx.beginPath();
			ctx.arc(p.x, p.y, R, 0, Math.PI * 2);
			ctx.fill();
			if (p.flash) {
				ctx.globalAlpha = 0.7;
				ctx.fillStyle = "#ffcf6b";
				ctx.beginPath();
				ctx.arc(p.flash.x, p.flash.y, 12, 0, Math.PI * 2);
				ctx.fill();
			}
			ctx.restore();
		}
	}

	function drawScene(ctx) {
		drawBackground(ctx);

		// Monster
		const baseMonsterOriginX = world.width - 80 - 16 * SCALE;
		const baseMonsterOriginY = world.groundY - 18 * SCALE - 26;
		const hoverY = getMonsterHoverOffset();
		const monsterOriginX = baseMonsterOriginX;
		const monsterOriginY = baseMonsterOriginY + hoverY;

		// Player position with idle sway
		const swayAmp = (keysRef.current.left || keysRef.current.right) ? 2 : 4;
		const sway = Math.sin(performance.now() * 0.003) * swayAmp;
		const playerRenderX = playerBaseX + sway;
		drawSpriteWithOutline(ctx, getPlayerPixelsFancy(), playerRenderX, playerYRef.current, SCALE);

		// Monster draw + shadow
		ctx.save();
		ctx.filter = "drop-shadow(0px 0px 8px rgba(124,92,255,0.25))";
		drawPixels(ctx, getMonsterPixelsFancy(), monsterOriginX, monsterOriginY);
		ctx.restore();

		const monsterCenterX = monsterOriginX + 8 * SCALE;
		const shadowY = world.groundY + 6;
		ctx.save();
		ctx.globalAlpha = 0.25 + Math.max(0, 0.25 - Math.abs(hoverY) / 60);
		ctx.fillStyle = "#000000";
		ctx.beginPath();
		ctx.ellipse(monsterCenterX, shadowY, 22, 8, 0, 0, Math.PI * 2);
		ctx.fill();
		ctx.restore();

		// Top UI
		drawTopUI(ctx);

		// Projectile
		renderProjectile(ctx, projectileRef.current);

		// Floating text
		if (floatRef.current.active) {
			const elapsed = performance.now() - floatRef.current.start;
			const t = Math.min(1, elapsed / floatRef.current.duration);
			ctx.font = "bold 16px monospace";
			ctx.fillStyle = floatRef.current.color;
			ctx.textAlign = "center";
			ctx.fillText(floatRef.current.text, monsterCenterX, (baseMonsterOriginY + hoverY) - 28 - t * 22);
			if (t >= 1) floatRef.current.active = false;
		}
	}

	function drawPixels(ctx, pixels, originX, originY) {
		for (const p of pixels) {
			ctx.fillStyle = p.color;
			ctx.fillRect(originX + p.x * SCALE, originY + p.y * SCALE, SCALE, SCALE);
		}
	}

	function animateProjectile(fromX, fromY, toX, toY, color, onHit, flashAtStart, kind = "bullet") {
		return new Promise((resolve) => {
			const dx = toX - fromX, dy = toY - fromY;
			const len = Math.hypot(dx, dy) || 1;
			const vx = (dx / len) * PROJECTILE_SPEED;
			const vy = (dy / len) * PROJECTILE_SPEED;

			projectileRef.current = {
				x: fromX, y: fromY, vx, vy,
				w: kind === "bullet" ? 16 : 10,
				h: kind === "bullet" ? 5 : 10,
				color, kind,
				flash: flashAtStart ? { x: fromX, y: fromY, t: performance.now() } : null,
				tail: []
			};

			const step = () => {
				const p = projectileRef.current;
				if (!p) return resolve();
				if (p.flash && performance.now() - p.flash.t > 90) p.flash = null;

				p.x += p.vx;
				p.y += p.vy;

				if (p.kind === "fireball") {
					p.tail.push({ x: p.x, y: p.y, t: performance.now() });
					if (p.tail.length > 12) p.tail.shift();
				}

				const reached =
					(p.vx >= 0 ? p.x >= toX : p.x <= toX) &&
					(p.vy >= 0 ? p.y >= toY : p.y <= toY);

				if (!reached) {
					requestAnimationFrame(step);
				} else {
					const ctx = canvasRef.current.getContext("2d");
					ctx.globalAlpha = 0.9;
					ctx.fillStyle = p.kind === "fireball" ? "#ffa84d" : color;
					ctx.beginPath();
					ctx.arc(toX, toY, p.kind === "fireball" ? 18 : 14, 0, Math.PI * 2);
					ctx.fill();
					ctx.globalAlpha = 1;

					projectileRef.current = null;
					onHit && onHit();
					resolve();
				}
			};
			requestAnimationFrame(step);
		});
	}

	function shootBullet(fromX, fromY, toX, toY, onHit) {
		return animateProjectile(fromX, fromY, toX, toY, "#fffb8f", onHit, true, "bullet");
	}
	function castFireball(fromX, fromY, toX, toY, onHit) {
		return animateProjectile(fromX, fromY, toX, toY, "#ff7a3d", onHit, true, "fireball");
	}

	function getPositions() {
		const swayAmp = (keysRef.current.left || keysRef.current.right) ? 2 : 4;
		const sway = Math.sin(performance.now() * 0.003) * swayAmp;
		const playerRenderX = playerBaseX + sway;

		const muzzleX = playerRenderX + 24 * SCALE;
		const muzzleY = playerYRef.current + 16 * SCALE;

		const baseMonsterOriginX = world.width - 80 - 16 * SCALE;
		const baseMonsterOriginY = world.groundY - 18 * SCALE - 26;
		const hoverY = getMonsterHoverOffset();
		const monsterOriginX = baseMonsterOriginX;
		const monsterOriginY = baseMonsterOriginY + hoverY;

		const monsterCenterX = monsterOriginX + 8 * SCALE;
		const monsterCenterY = monsterOriginY + 8 * SCALE;

		const playerCenterX = playerRenderX + 8 * SCALE;
		const playerCenterY = playerYRef.current + 12 * SCALE;

		return { muzzleX, muzzleY, monsterCenterX, monsterCenterY, playerCenterX, playerCenterY };
	}

	// Movement
	function updatePlayerMovement() {
		const bounds = playerBoundsRef.current;
		if (keysRef.current.left) setPlayerBaseX((x) => Math.max(bounds.min, x - 2.6));
		if (keysRef.current.right) setPlayerBaseX((x) => Math.min(bounds.max, x + 2.6));
	}

	// Q&A
	function startGame() {
		if (started) return;
		setStarted(true);
		nextQuestion();
	}

	function nextQuestion() {
		setQIndex((idx) => {
			const next = (idx + 1) % questions.length;
			acceptingAnswerRef.current = true;
			return next === 0 ? 1 : idx + 1; // show 1..n
		});
	}

	async function onOption(opt, q) {
		if (!acceptingAnswerRef.current) return;
		acceptingAnswerRef.current = false;

		const { muzzleX, muzzleY, monsterCenterX, monsterCenterY, playerCenterX, playerCenterY } = getPositions();

		if (opt === q.answer) {
			setCorrectAnswers((c) => c + 1);
			await shootBullet(muzzleX, muzzleY, monsterCenterX, monsterCenterY, () => {
				setMonsterHP((h) => Math.max(0, h - 10));
				showFloating("Monster hit! -10", monsterCenterX, monsterCenterY - 28, "#fffb8f");
			});
		} else {
			setWrongAnswers((w) => w + 1);
			await castFireball(monsterCenterX, monsterCenterY, playerCenterX, playerCenterY, () => {
				setPlayerHP((h) => Math.max(0, h - WRONG_ANSWER_PENALTY));
				showFloating(`Player hit! -${WRONG_ANSWER_PENALTY}`, playerCenterX, playerCenterY - 28, "#ff7a3d");
			});
		}

		// End conditions
		if (wrongAnswers + 1 >= WRONG_LIMIT && opt !== questions[(qIndex - 1 + questions.length) % questions.length].answer) {
			setPlayerHP(0);
			setOverlay({ open: true, title: "Game Over!", msg: "4 mistakes reached. Try again!", victory: false });
			return;
		}
		if (correctAnswers + (opt === questions[(qIndex - 1 + questions.length) % questions.length].answer ? 1 : 0) >= 10) {
			setMonsterHP(0);
			setOverlay({ open: true, title: "Victory!", msg: "You defeated the monster! Great job!", victory: true });
			return;
		}

		// Next
		nextQuestion();
	}

	function showFloating(text, x, y, color) {
		floatRef.current = { active: true, text, x, y, color, start: performance.now(), duration: 650 };
	}

	function reset() {
		setPlayerHP(MAX_HP);
		setMonsterHP(MAX_HP);
		setWrongAnswers(0);
		setCorrectAnswers(0);
		setQIndex(0);
		setStarted(false);
		setPlayerBaseX(70);
		setOverlay({ open: false, title: "", msg: "", victory: false });
	}

	// UI bits
	const currentQuestion = started ? questions[(qIndex - 1 + questions.length) % questions.length] : null;

	return (
		<div style={{ width: "min(920px,96vw)", margin: "12px auto", color: "#e9ecff", fontFamily: "Segoe UI, Roboto, Arial, sans-serif" }}>
			<div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "linear-gradient(90deg,#212545,#171a33)", border: "1px solid #2a2f5a", borderRadius: 14, padding: "10px 14px" }}>
				<div style={{ fontWeight: 800 }}>{gameTitle || 'Pixel Shooter Quiz — NCERT Class 8 Science: Force'}</div>
				<div style={{ fontSize: 12, background: "linear-gradient(135deg,#7c5cff,#9d7bff)", padding: "6px 10px", borderRadius: 999, color: "#fff" }}>React</div>
			</div>

			<div style={{ marginTop: 12, background: "linear-gradient(180deg,#121427,#0f1222)", border: "2px solid #2a2f5a", borderRadius: 16, padding: 14 }}>
				<div style={{ borderRadius: 12, overflow: "hidden", background: "linear-gradient(180deg,#0e1122,#0f1120)" }}>
					<canvas ref={canvasRef} width={world.width} height={world.height} style={{ width: "100%", display: "block", imageRendering: "pixelated" }} />
				</div>

				<div style={{ marginTop: 14, background: "linear-gradient(180deg,#171b3a,#131635)", border: "2px solid #2a2f5a", borderRadius: 14, padding: 12 }}>
					<div style={{ fontWeight: 800, backgroundImage: "linear-gradient(90deg,#ffffff,#b2b7ff 60%,#ffffff)", WebkitBackgroundClip: "text", backgroundClip: "text", color: "transparent", textShadow: "0 0 22px rgba(124,92,255,.18)", margin: "6px 0 10px 0" }}>
						{!started ? "Press Start to begin!" : `Q${Math.max(qIndex, 1)}. ${currentQuestion?.question}`}
					</div>

					<div style={{ display: "grid", gridTemplateColumns: "repeat(2,1fr)", gap: 10 }}>
						{started && currentQuestion?.options.map((opt) => (
							<button key={opt} onClick={() => onOption(opt, currentQuestion)} className="btn"
								style={{
									border: "1px solid #2e3466", borderRadius: 12, padding: "12px 14px", textAlign: "left",
									background: "linear-gradient(180deg,#222650,#1a1e44)", color: "#eaf0ff", fontWeight: 700, cursor: "pointer",
									boxShadow: "0 6px 18px rgba(0,0,0,.25)"
								}}>
								{opt}
							</button>
						))}
					</div>

					<div style={{ marginTop: 10, display: "flex", gap: 10, justifyContent: "flex-end" }}>
						{!started ? (
							<button onClick={startGame} style={ctaStyle}>Start</button>
						) : (
							<button onClick={nextQuestion} style={ctaStyle}>Next</button>
						)}
					</div>

					<div style={{ fontSize: 12, color: "#b8c1ff", opacity: .9, marginTop: 2 }}>Get 10 correct to win. 4 wrong answers = instant defeat.</div>
				</div>
			</div>

			{overlay.open && (
				<div style={{
					position: "fixed", inset: 0, display: "grid", placeItems: "center",
					background: "linear-gradient(180deg,rgba(8,9,16,.8),rgba(8,9,16,.85))", backdropFilter: "blur(4px)"
				}}>
					<div style={{ width: "min(560px,92vw)", background: "linear-gradient(180deg,#191d3e,#141737)", border: "2px solid #2a2f5a", borderRadius: 16, padding: 18, textAlign: "center" }}>
						<h2 style={{ margin: 0, color: overlay.victory ? "#74f794" : "#ff7a7a" }}>{overlay.title}</h2>
						<p style={{ color: "#b8c1ff" }}>{overlay.msg}</p>
						<button onClick={reset} style={ctaStyle}>Play Again</button>
					</div>
				</div>
			)}
		</div>
	);
}

const ctaStyle = {
	border: "1px solid #3b3fb0",
	borderRadius: 12,
	padding: "10px 14px",
	cursor: "pointer",
	fontWeight: 800,
	background: "linear-gradient(135deg,#5b61ff,#7c5cff)",
	color: "#fff",
	boxShadow: "0 8px 26px rgba(124,92,255,.35)"
};



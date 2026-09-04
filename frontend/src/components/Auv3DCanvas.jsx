import React, { useEffect, useRef } from 'react';
import { Compass, Gauge, Navigation } from 'lucide-react';

export default function Auv3DCanvas({ pitch, roll, heaveAmp, altitude, surge }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const propsRef = useRef({ pitch, roll, heaveAmp, altitude, surge });

  useEffect(() => {
    propsRef.current = { pitch, roll, heaveAmp, altitude, surge };
  }, [pitch, roll, heaveAmp, altitude, surge]);

  useEffect(() => {
    let animationFrameId;
    let renderer, scene, camera, auvGroup, propeller, fanBeamPort, fanBeamStbd;

    import('https://esm.sh/three@0.160.0')
      .then((THREE) => {
        if (!containerRef.current || !canvasRef.current) return;

        const width = containerRef.current.clientWidth || 600;
        const height = 360;

        // 1. Natural Ocean Scene
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x061121); // Deep oceanic blue
        scene.fog = new THREE.FogExp2(0x061121, 0.032);

        // 2. Camera Setup
        camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
        camera.position.set(0, 2.2, 12);
        camera.lookAt(0, -0.2, 0);

        // 3. Renderer Setup
        renderer = new THREE.WebGLRenderer({
          canvas: canvasRef.current,
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance'
        });
        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        // 4. Natural Underwater Lighting
        const ambientLight = new THREE.AmbientLight(0x1e3a5f, 2.2);
        scene.add(ambientLight);

        const sunLight = new THREE.DirectionalLight(0x38bdf8, 2.8);
        sunLight.position.set(5, 12, 6);
        sunLight.castShadow = true;
        scene.add(sunLight);

        const fillLight = new THREE.DirectionalLight(0xf59e0b, 0.9);
        fillLight.position.set(-6, -4, -5);
        scene.add(fillLight);

        // 5. Realistic AUV Submarine Model
        auvGroup = new THREE.Group();

        // Realistic PBR Materials
        const hullYellowMat = new THREE.MeshStandardMaterial({
          color: 0xeab308,
          roughness: 0.3,
          metalness: 0.4,
        });

        const armorMat = new THREE.MeshStandardMaterial({
          color: 0x18181b,
          roughness: 0.4,
          metalness: 0.8
        });

        const metalMat = new THREE.MeshStandardMaterial({
          color: 0xcbd5e1,
          metalness: 0.9,
          roughness: 0.2
        });

        const glassMat = new THREE.MeshPhysicalMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.85,
          roughness: 0.1,
          ior: 1.4
        });

        // Main Hull Body
        const hullGeo = new THREE.CylinderGeometry(0.85, 0.85, 5.0, 32);
        hullGeo.rotateZ(Math.PI / 2);
        const hullMesh = new THREE.Mesh(hullGeo, hullYellowMat);
        hullMesh.castShadow = true;
        auvGroup.add(hullMesh);

        // Glass Nose Dome
        const noseGeo = new THREE.SphereGeometry(0.85, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
        noseGeo.rotateZ(-Math.PI / 2);
        const noseMesh = new THREE.Mesh(noseGeo, glassMat);
        noseMesh.position.set(2.5, 0, 0);
        auvGroup.add(noseMesh);

        // Internal Optical Sensor
        const sensorGeo = new THREE.SphereGeometry(0.35, 16, 16);
        const sensorMat = new THREE.MeshBasicMaterial({ color: 0x06b6d4 });
        const sensorMesh = new THREE.Mesh(sensorGeo, sensorMat);
        sensorMesh.position.set(2.35, 0, 0);
        auvGroup.add(sensorMesh);

        // Tail Cone
        const tailGeo = new THREE.ConeGeometry(0.85, 1.3, 32);
        tailGeo.rotateZ(-Math.PI / 2);
        const tailMesh = new THREE.Mesh(tailGeo, armorMat);
        tailMesh.position.set(-3.15, 0, 0);
        auvGroup.add(tailMesh);

        // Stabilizer Fins
        const finGeo = new THREE.BoxGeometry(0.7, 1.6, 0.08);
        const finV = new THREE.Mesh(finGeo, armorMat);
        finV.position.set(-2.8, 0, 0);
        auvGroup.add(finV);

        const finH = new THREE.Mesh(finGeo, armorMat);
        finH.rotation.x = Math.PI / 2;
        finH.position.set(-2.8, 0, 0);
        auvGroup.add(finH);

        // Transducer Fairing Pods
        const podGeo = new THREE.BoxGeometry(3.4, 0.2, 0.3);
        const podPort = new THREE.Mesh(podGeo, metalMat);
        podPort.position.set(0, -0.75, 0.65);
        auvGroup.add(podPort);

        const podStbd = new THREE.Mesh(podGeo, metalMat);
        podStbd.position.set(0, -0.75, -0.65);
        auvGroup.add(podStbd);

        // Propeller
        propeller = new THREE.Group();
        const hubGeo = new THREE.CylinderGeometry(0.18, 0.18, 0.35, 16);
        hubGeo.rotateZ(Math.PI / 2);
        const hubMesh = new THREE.Mesh(hubGeo, metalMat);
        propeller.add(hubMesh);

        const bladeGeo = new THREE.BoxGeometry(0.08, 1.1, 0.2);
        for (let i = 0; i < 4; i++) {
          const blade = new THREE.Mesh(bladeGeo, metalMat);
          blade.rotation.x = (i * Math.PI) / 2;
          propeller.add(blade);
        }
        propeller.position.set(-3.9, 0, 0);
        auvGroup.add(propeller);

        // Acoustic Fan Beams (Transparent Sonar Cones)
        const beamGeo = new THREE.ConeGeometry(8.5, 7.0, 32, 1, true, -Math.PI / 4, Math.PI / 2);
        const beamMatPort = new THREE.MeshBasicMaterial({
          color: 0x38bdf8,
          transparent: true,
          opacity: 0.18,
          side: THREE.DoubleSide,
          depthWrite: false
        });
        const beamMatStbd = new THREE.MeshBasicMaterial({
          color: 0xf59e0b,
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide,
          depthWrite: false
        });

        fanBeamPort = new THREE.Mesh(beamGeo, beamMatPort);
        fanBeamPort.rotation.z = Math.PI;
        fanBeamPort.position.set(0, -4.2, 2.2);
        auvGroup.add(fanBeamPort);

        fanBeamStbd = new THREE.Mesh(beamGeo, beamMatStbd);
        fanBeamStbd.rotation.z = Math.PI;
        fanBeamStbd.position.set(0, -4.2, -2.2);
        auvGroup.add(fanBeamStbd);

        scene.add(auvGroup);

        // 6. Seafloor Grid & Debris Objects
        const seabedGrid = new THREE.GridHelper(36, 36, 0x0ea5e9, 0x032838);
        seabedGrid.position.y = -5.4;
        scene.add(seabedGrid);

        // Subsea ISO Container Target
        const containerGeo = new THREE.BoxGeometry(2.5, 1.2, 1.2);
        const containerMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.6 });
        const containerMesh = new THREE.Mesh(containerGeo, containerMat);
        containerMesh.position.set(2.6, -4.8, 2.0);
        containerMesh.rotation.y = 0.3;
        containerMesh.castShadow = true;
        scene.add(containerMesh);

        // Mouse Drag Camera Orbit
        let isDragging = false;
        let prevMouseX = 0, prevMouseY = 0;

        const onMouseDown = (e) => {
          isDragging = true;
          prevMouseX = e.clientX;
          prevMouseY = e.clientY;
        };

        const onMouseMove = (e) => {
          if (!isDragging) return;
          const dx = e.clientX - prevMouseX;
          const dy = e.clientY - prevMouseY;

          camera.position.x += dx * 0.012;
          camera.position.y -= dy * 0.012;
          camera.position.y = Math.max(-2, Math.min(7, camera.position.y));
          camera.lookAt(0, -0.2, 0);

          prevMouseX = e.clientX;
          prevMouseY = e.clientY;
        };

        const onMouseUp = () => { isDragging = false; };

        const canvasEl = canvasRef.current;
        if (canvasEl) {
          canvasEl.addEventListener('mousedown', onMouseDown);
          window.addEventListener('mousemove', onMouseMove);
          window.addEventListener('mouseup', onMouseUp);
        }

        // Render Loop
        let timeAcc = 0;
        const renderLoop = () => {
          animationFrameId = requestAnimationFrame(renderLoop);
          timeAcc += 0.016;

          const p = propsRef.current;

          if (auvGroup) {
            // Update 3D orientation directly
            auvGroup.rotation.z = -(p.pitch * Math.PI) / 180;
            auvGroup.rotation.x = (p.roll * Math.PI) / 180;
            const heaveY = Math.sin(timeAcc * 2.2) * (p.heaveAmp * 0.35);
            const altY = (12 - p.altitude) * 0.16;
            auvGroup.position.y = heaveY + altY;
          }

          if (propeller) {
            propeller.rotation.x += p.surge * 0.12;
          }

          renderer.render(scene, camera);
        };

        renderLoop();
      })
      .catch((err) => console.error('Three.js load error:', err));

    return () => {
      if (animationFrameId) cancelAnimationFrame(animationFrameId);
      if (renderer) renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="bg-[#111827] border border-gray-800 rounded-md p-4 relative overflow-hidden font-sans">
      
      {/* Header */}
      <div className="flex items-center justify-between mb-3 border-b border-gray-800 pb-3">
        <div className="flex items-center gap-2">
          <Navigation className="w-4 h-4 text-neutral-300" />
          <h3 className="text-xs font-semibold text-zinc-100 uppercase tracking-wider">
            3D Subsea Simulation Engine
          </h3>
        </div>
        <span className="text-[11px] text-zinc-500 font-mono">
          Drag to rotate 3D view
        </span>
      </div>

      {/* 3D WebGL Canvas Viewport */}
      <div className="relative h-80 bg-[#0b0f17] rounded-md overflow-hidden border border-gray-800 cursor-grab active:cursor-grabbing">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Clean, Refined Telemetry Overlay Pills */}
        <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-none text-xs font-mono">
          
          <div className="bg-[#111827] border border-gray-800 rounded-md px-3 py-1.5 text-zinc-300 flex items-center gap-3 shadow-sm">
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase font-sans">Pitch</span>
              <span className="font-bold text-amber-400">{pitch > 0 ? '+' : ''}{pitch.toFixed(1)}°</span>
            </div>
            <div className="w-px h-5 bg-zinc-800" />
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase font-sans">Roll</span>
              <span className="font-bold text-white">{roll > 0 ? '+' : ''}{roll.toFixed(1)}°</span>
            </div>
            <div className="w-px h-5 bg-zinc-800" />
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase font-sans">Heave</span>
              <span className="font-bold text-purple-300">±{heaveAmp.toFixed(1)}m</span>
            </div>
          </div>

          <div className="bg-[#111827] border border-gray-800 rounded-md px-3 py-1.5 text-zinc-300 flex items-center gap-3 shadow-sm">
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase font-sans">Altitude</span>
              <span className="font-bold text-white">{altitude.toFixed(1)}m</span>
            </div>
            <div className="w-px h-5 bg-zinc-800" />
            <div>
              <span className="text-[10px] text-zinc-500 block uppercase font-sans">Speed</span>
              <span className="font-bold text-emerald-400">{surge.toFixed(1)} kts</span>
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}

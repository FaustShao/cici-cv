// Adapted from Bruno Simon's folio-2025 Flowers.js (MIT, pinned in ASSET_SOURCE).
// Retains the original eight-petal clusters and wind; filters new fixtures out.
import * as THREE from 'three/webgpu'
import { attribute, color, Fn, instance, mix, positionLocal, vec3 } from 'three/tsl'
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js'
import { alea } from 'seedrandom'
import { Game } from '../Game.js'
import { MeshDefaultMaterial } from '../Materials/MeshDefaultMaterial.js'

export class Flowers {
    constructor(references, accepts) {
        this.game = Game.getInstance()
        this.references = references
        const rng = new alea('flowers')
        const matrices = [], tints = []
        this.positions = []
        for(const ref of references) {
            const count = 3 + Math.floor(rng() * 8)
            for(let i = 0; i < count; i++) {
                const x = ref.position.x + (rng() - .5) * 3
                const z = ref.position.z + (rng() - .5) * 3
                const angle = rng() * Math.PI * 2, scale = .6 + rng() * .4
                const tint = rng() < .65 ? .8 + rng() * .2 : .1
                if(!accepts(x,z)) continue
                const object = new THREE.Object3D()
                object.position.set(x,ref.position.y,z)
                object.rotation.y = angle
                object.scale.setScalar(scale)
                object.updateMatrix()
                matrices.push(object.matrix)
                tints.push(tint)
                this.positions.push([x,z])
            }
        }
        this.transformMatrices = matrices
        const planes = []
        for(let i = 0; i < 8; i++) {
            const plane = new THREE.PlaneGeometry(.08,.08)
            const spherical = new THREE.Spherical(1,Math.PI * .2 * rng(),Math.PI * 2 * rng())
            const direction = new THREE.Vector3().setFromSpherical(spherical)
            const position = direction.clone().setLength(1 + (rng() - .5) * .5)
            position.y -= .75
            const matrix = new THREE.Matrix4().lookAt(direction,new THREE.Vector3(),new THREE.Vector3(0,1,0))
            matrix.setPosition(position).scale(new THREE.Vector3().setScalar(1 + rng() - .5))
            planes.push(plane.applyMatrix4(matrix))
        }
        const geometry = mergeGeometries(planes)
        planes.forEach(p=>p.dispose())
        geometry.deleteAttribute('uv')
        geometry.setAttribute('flowerTint',new THREE.InstancedBufferAttribute(new Float32Array(tints),1))
        this.material = new MeshDefaultMaterial({
            side:THREE.DoubleSide,
            colorNode:mix(color('#fff3df'),color('#ef93b7'),attribute('flowerTint','float')),
            hasWater:false,
        })
        this.instanceMatrix = new THREE.InstancedBufferAttribute(new Float32Array(matrices.length * 16),16)
        matrices.forEach((matrix,i)=>matrix.toArray(this.instanceMatrix.array,i * 16))
        this.material.positionNode = Fn(({object})=>{
            instance(object.count,this.instanceMatrix).toStack()
            const wind = this.game.wind.offsetNode(positionLocal.xz)
            return positionLocal.add(vec3(wind.x,0,wind.y).mul(positionLocal.y.clamp(0,1)))
        })()
        this.mesh = new THREE.InstancedMesh(geometry,this.material,matrices.length)
        this.mesh.name = 'native-pink-and-ivory-flowers'
        this.mesh.castShadow = this.mesh.receiveShadow = true
        this.mesh.frustumCulled = false
        this.game.scene.add(this.mesh)
    }
}

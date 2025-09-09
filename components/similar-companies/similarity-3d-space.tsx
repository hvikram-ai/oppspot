'use client'

import { useState, useRef, useMemo, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Text, Html, PerspectiveCamera } from '@react-three/drei'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Maximize, 
  Settings,
  Eye,
  EyeOff
} from 'lucide-react'
import * as THREE from 'three'

interface SimilarityMatch {
  id: string
  company_name: string
  overall_score: number
  financial_score: number
  strategic_score: number
  operational_score: number
  market_score: number
  risk_score: number
  esg_score?: number
  confidence: number
  company_data?: {
    country?: string
    industry?: string
    revenue?: string
  }
}

interface Similarity3DSpaceProps {
  matches: SimilarityMatch[]
  targetCompany: string
  onCompanySelect?: (company: SimilarityMatch) => void
  dimensions?: {
    x: keyof SimilarityMatch
    y: keyof SimilarityMatch
    z: keyof SimilarityMatch
  }
}

interface CompanyNodeProps {
  match: SimilarityMatch
  position: [number, number, number]
  onSelect?: (company: SimilarityMatch) => void
  selected?: boolean
  targetCompany?: boolean
}

function CompanyNode({ match, position, onSelect, selected, targetCompany }: CompanyNodeProps) {
  const meshRef = useRef<THREE.Mesh>(null)
  const [hovered, setHovered] = useState(false)
  
  useFrame((state) => {
    if (meshRef.current) {
      // Gentle floating animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime + position[0]) * 0.1
      
      // Gentle rotation when hovered
      if (hovered) {
        meshRef.current.rotation.y += 0.02
      }
    }
  })

  const getNodeColor = () => {
    if (targetCompany) return '#ff6b35' // Orange for target company
    if (selected) return '#3b82f6' // Blue for selected
    if (hovered) return '#10b981' // Green for hovered
    
    // Color based on overall score
    const score = match.overall_score
    if (score >= 85) return '#22c55e' // Green for excellent
    if (score >= 70) return '#3b82f6' // Blue for good
    if (score >= 55) return '#f59e0b' // Yellow for fair
    return '#ef4444' // Red for poor
  }

  const getNodeSize = () => {
    if (targetCompany) return 0.8
    const baseSize = 0.3
    const sizeMultiplier = (match.confidence / 100) * 0.5 + 0.5
    return baseSize * sizeMultiplier
  }

  return (
    <group position={position}>
      <mesh
        ref={meshRef}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
        onClick={() => onSelect?.(match)}
        scale={hovered ? 1.2 : 1}
      >
        <sphereGeometry args={[getNodeSize(), 32, 32]} />
        <meshStandardMaterial 
          color={getNodeColor()} 
          roughness={0.3}
          metalness={0.7}
          transparent
          opacity={hovered ? 1 : 0.8}
        />
      </mesh>
      
      {/* Company name label */}
      {(hovered || selected || targetCompany) && (
        <Html distanceFactor={15} position={[0, getNodeSize() + 0.5, 0]}>
          <div className="bg-black/80 text-white px-2 py-1 rounded text-xs whitespace-nowrap pointer-events-none">
            <div className="font-semibold">{match.company_name}</div>
            <div className="text-xs opacity-80">
              Score: {match.overall_score}% | Confidence: {match.confidence}%
            </div>
          </div>
        </Html>
      )}
      
      {/* Connection lines to target company if not target */}
      {!targetCompany && selected && (
        <line>
          <bufferGeometry>
            <bufferAttribute
              attach="attributes-position"
              array={new Float32Array([0, 0, 0, -position[0], -position[1], -position[2]])}
              count={2}
              itemSize={3}
            />
          </bufferGeometry>
          <lineBasicMaterial color="#3b82f6" opacity={0.3} transparent />
        </line>
      )}
    </group>
  )
}

function Scene({ matches, targetCompany, onCompanySelect, dimensions, selectedCompany }: {
  matches: SimilarityMatch[]
  targetCompany: string
  onCompanySelect?: (company: SimilarityMatch) => void
  dimensions: { x: keyof SimilarityMatch, y: keyof SimilarityMatch, z: keyof SimilarityMatch }
  selectedCompany?: string
}) {
  const { camera } = useThree()
  
  // Calculate positions based on scoring dimensions with safe initialization
  const companiesWithPositions = useMemo(() => {
    if (!matches || matches.length === 0) {
      return []
    }
    
    const maxRange = 10
    
    return matches.map(match => {
      const xValue = typeof match[dimensions.x] === 'number' ? match[dimensions.x] as number : 50
      const yValue = typeof match[dimensions.y] === 'number' ? match[dimensions.y] as number : 50
      const zValue = typeof match[dimensions.z] === 'number' ? match[dimensions.z] as number : 50
      
      const x = (xValue / 100) * maxRange - maxRange/2
      const y = (yValue / 100) * maxRange - maxRange/2  
      const z = (zValue / 100) * maxRange - maxRange/2
      
      return {
        ...match,
        position: [x, y, z] as [number, number, number]
      }
    })
  }, [matches, dimensions])

  // Add target company at center
  const targetPosition: [number, number, number] = [0, 0, 0]
  const targetMatch = {
    id: 'target',
    company_name: targetCompany,
    overall_score: 100,
    financial_score: 50,
    strategic_score: 50,
    operational_score: 50,
    market_score: 50,
    risk_score: 50,
    confidence: 100
  }

  return (
    <>
      {/* Lighting */}
      <ambientLight intensity={0.5} />
      <pointLight position={[10, 10, 10]} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />
      
      {/* Target company at center */}
      <CompanyNode
        match={targetMatch}
        position={targetPosition}
        onSelect={onCompanySelect}
        targetCompany={true}
      />
      
      {/* Similar companies */}
      {companiesWithPositions.map(company => (
        <CompanyNode
          key={company.id}
          match={company}
          position={company.position}
          onSelect={onCompanySelect}
          selected={selectedCompany === company.id}
        />
      ))}
      
      {/* Axis labels */}
      <Text
        position={[12, 0, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {dimensions.x.replace('_', ' ').toUpperCase()}
      </Text>
      <Text
        position={[0, 12, 0]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {dimensions.y.replace('_', ' ').toUpperCase()}
      </Text>
      <Text
        position={[0, 0, 12]}
        fontSize={0.8}
        color="white"
        anchorX="center"
        anchorY="middle"
      >
        {dimensions.z.replace('_', ' ').toUpperCase()}
      </Text>
      
      {/* Grid helper */}
      <gridHelper args={[20, 20, '#444444', '#444444']} />
      
      {/* Controls */}
      <OrbitControls 
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        maxDistance={50}
        minDistance={5}
      />
    </>
  )
}

export function Similarity3DSpace({ 
  matches, 
  targetCompany, 
  onCompanySelect,
  dimensions = { x: 'financial_score', y: 'strategic_score', z: 'operational_score' }
}: Similarity3DSpaceProps) {
  const [selectedCompany, setSelectedCompany] = useState<string | null>(null)
  const [showControls, setShowControls] = useState(true)
  const [currentDimensions, setCurrentDimensions] = useState(dimensions)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const handleCompanySelect = (company: SimilarityMatch) => {
    setSelectedCompany(company.id)
    onCompanySelect?.(company)
  }

  const handleReset = () => {
    setSelectedCompany(null)
  }

  const handleFullscreen = () => {
    if (canvasRef.current?.parentElement) {
      canvasRef.current.parentElement.requestFullscreen()
    }
  }

  const dimensionOptions = [
    { key: 'financial_score', label: 'Financial' },
    { key: 'strategic_score', label: 'Strategic' },
    { key: 'operational_score', label: 'Operational' },
    { key: 'market_score', label: 'Market' },
    { key: 'risk_score', label: 'Risk' },
    { key: 'overall_score', label: 'Overall' },
    { key: 'confidence', label: 'Confidence' }
  ]

  const selectedMatch = matches.find(m => m.id === selectedCompany)

  return (
    <Card className="w-full h-[600px] relative overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle>3D Similarity Space</CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowControls(!showControls)}
            >
              {showControls ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </Button>
            <Button variant="outline" size="sm" onClick={handleReset}>
              <RotateCcw className="h-4 w-4" />
            </Button>
            <Button variant="outline" size="sm" onClick={handleFullscreen}>
              <Maximize className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Dimension selectors */}
        {showControls && (
          <div className="flex flex-wrap gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-red-500">X:</span>
              <select 
                value={currentDimensions.x}
                onChange={(e) => setCurrentDimensions({...currentDimensions, x: e.target.value as keyof SimilarityMatch})}
                className="bg-background border rounded px-2 py-1"
              >
                {dimensionOptions.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-green-500">Y:</span>
              <select 
                value={currentDimensions.y}
                onChange={(e) => setCurrentDimensions({...currentDimensions, y: e.target.value as keyof SimilarityMatch})}
                className="bg-background border rounded px-2 py-1"
              >
                {dimensionOptions.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-1">
              <span className="text-blue-500">Z:</span>
              <select 
                value={currentDimensions.z}
                onChange={(e) => setCurrentDimensions({...currentDimensions, z: e.target.value as keyof SimilarityMatch})}
                className="bg-background border rounded px-2 py-1"
              >
                {dimensionOptions.map(opt => (
                  <option key={opt.key} value={opt.key}>{opt.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="h-full p-0 relative">
        <div className="h-full bg-gradient-to-br from-gray-900 to-gray-800">
          <Canvas
            ref={canvasRef}
            className="h-full w-full"
            camera={{ position: [15, 15, 15], fov: 75 }}
          >
            <Suspense fallback={null}>
              <Scene
                matches={matches}
                targetCompany={targetCompany}
                onCompanySelect={handleCompanySelect}
                dimensions={currentDimensions}
                selectedCompany={selectedCompany}
              />
            </Suspense>
          </Canvas>
          
          {/* Legend */}
          <div className="absolute bottom-4 left-4 bg-black/80 text-white p-3 rounded-lg text-xs">
            <div className="mb-2 font-semibold">Legend</div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-orange-500 rounded-full"></div>
                <span>Target Company</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span>Excellent (85%+)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                <span>Good (70-84%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span>Fair (55-69%)</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span>Poor (&lt;55%)</span>
              </div>
            </div>
          </div>
          
          {/* Selected company info */}
          {selectedMatch && (
            <div className="absolute top-4 right-4 bg-black/90 text-white p-4 rounded-lg max-w-xs">
              <div className="font-semibold mb-2">{selectedMatch.company_name}</div>
              <div className="space-y-1 text-xs">
                <div className="flex justify-between">
                  <span>Overall Score:</span>
                  <span className="font-mono">{selectedMatch.overall_score}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Confidence:</span>
                  <span className="font-mono">{selectedMatch.confidence}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Financial:</span>
                  <span className="font-mono">{selectedMatch.financial_score}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Strategic:</span>
                  <span className="font-mono">{selectedMatch.strategic_score}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Operational:</span>
                  <span className="font-mono">{selectedMatch.operational_score}%</span>
                </div>
                {selectedMatch.company_data && (
                  <div className="mt-2 pt-2 border-t border-gray-600">
                    <div className="text-xs opacity-80">
                      {selectedMatch.company_data.industry} • {selectedMatch.company_data.country}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}
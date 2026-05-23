import { useState } from 'react'
import { ChevronRight, ChevronLeft, CheckCircle2, Truck, HelpCircle, Info } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'

export interface AwardRecommendation {
  awardCode: 'MA000038' | 'MA000039'
  awardName: string
  classificationLevel: 'GRADE_1' | 'GRADE_2' | 'GRADE_3' | 'GRADE_4' | 'GRADE_5'
  vehicleGrade: 'LIGHT_RIGID' | 'MEDIUM_RIGID' | 'HEAVY_RIGID' | 'ARTICULATED' | 'COMBINATION' | null
  rationale: string
}

interface Props {
  open: boolean
  onClose: () => void
  onAccept: (rec: AwardRecommendation) => void
}

type VehicleAnswer = 'LIGHT_RIGID' | 'MEDIUM_RIGID' | 'HEAVY_RIGID' | 'ARTICULATED' | 'COMBINATION' | 'NO_VEHICLE'
type RouteAnswer = 'LOCAL' | 'LONG_DISTANCE'
type ResponsibilityAnswer = 'BASIC' | 'MULTI_DROP' | 'SUPERVISOR' | 'DANGEROUS_GOODS'

const VEHICLE_OPTIONS: { value: VehicleAnswer; label: string; description: string; icon?: string }[] = [
  { value: 'NO_VEHICLE',   label: 'No driving / off-road only', description: 'Warehouse, store person, loader — no road driving required' },
  { value: 'LIGHT_RIGID',  label: 'Light rigid (car licence)',   description: 'Under 8 tonnes GVM — ute, van, light truck' },
  { value: 'MEDIUM_RIGID', label: 'Medium rigid (MR licence)',   description: '8–15 tonnes GVM — 2-axle rigid truck' },
  { value: 'HEAVY_RIGID',  label: 'Heavy rigid (HR licence)',    description: 'Over 15 tonnes GVM, 3+ axles — e.g. 8-wheeler' },
  { value: 'ARTICULATED',  label: 'Articulated (HC licence)',    description: 'Semi-trailer, B-train — prime mover & single trailer' },
  { value: 'COMBINATION',  label: 'Multi-combination (MC licence)', description: 'B-double, road train, 3+ trailer combinations' },
]

const ROUTE_OPTIONS: { value: RouteAnswer; label: string; description: string }[] = [
  { value: 'LOCAL',         label: 'Local / regional delivery',  description: 'Returns to depot each day — usually within 150 km' },
  { value: 'LONG_DISTANCE', label: 'Long distance / overnight',  description: 'Regularly travels 200+ km from depot or stays overnight' },
]

const RESPONSIBILITY_OPTIONS: { value: ResponsibilityAnswer; label: string; description: string }[] = [
  { value: 'BASIC',          label: 'Standard driving duties',         description: 'Regular delivery runs with no special responsibilities' },
  { value: 'MULTI_DROP',     label: 'Multi-drop / complex routes',     description: 'High-volume deliveries, multiple stops, tight schedules' },
  { value: 'DANGEROUS_GOODS', label: 'Dangerous goods (ADG licence)',  description: 'Regularly carries Class 1–9 dangerous goods' },
  { value: 'SUPERVISOR',     label: 'Leading hand / supervisor',       description: 'Supervises other drivers or coordinates runs' },
]

function getRecommendation(
  vehicle: VehicleAnswer,
  route: RouteAnswer,
  responsibility: ResponsibilityAnswer,
): AwardRecommendation {
  const isLongDistance = route === 'LONG_DISTANCE'
  const awardCode: 'MA000038' | 'MA000039' = isLongDistance ? 'MA000039' : 'MA000038'
  const awardName = isLongDistance
    ? 'Road Transport (Long Distance Operations) Award [MA000039]'
    : 'Road Transport & Distribution Award [MA000038]'

  // Grade logic based on vehicle type + responsibilities
  let classificationLevel: AwardRecommendation['classificationLevel']
  let vehicleGrade: AwardRecommendation['vehicleGrade'] = null
  let rationale = ''

  if (vehicle === 'NO_VEHICLE') {
    classificationLevel = 'GRADE_1'
    rationale = 'Grade 1 covers non-driving roles such as store persons, loaders, and cleaners.'
  } else if (vehicle === 'LIGHT_RIGID') {
    vehicleGrade = 'LIGHT_RIGID'
    classificationLevel = responsibility === 'SUPERVISOR' ? 'GRADE_2' : 'GRADE_1'
    rationale = classificationLevel === 'GRADE_2'
      ? 'Grade 2 — light rigid vehicle with additional supervisory responsibilities.'
      : 'Grade 1 — car licence driver or light rigid vehicle (under 8 tonnes GVM).'
  } else if (vehicle === 'MEDIUM_RIGID') {
    vehicleGrade = 'MEDIUM_RIGID'
    classificationLevel = responsibility === 'SUPERVISOR' ? 'GRADE_3' : 'GRADE_2'
    rationale = classificationLevel === 'GRADE_3'
      ? 'Grade 3 — medium rigid vehicle with leading hand / supervisor responsibilities.'
      : 'Grade 2 — medium rigid vehicle (8–15 tonnes GVM, MR licence).'
  } else if (vehicle === 'HEAVY_RIGID') {
    vehicleGrade = 'HEAVY_RIGID'
    if (responsibility === 'SUPERVISOR') {
      classificationLevel = 'GRADE_4'
      rationale = 'Grade 4 — heavy rigid vehicle with leading hand / supervisor responsibilities.'
    } else if (responsibility === 'DANGEROUS_GOODS' || responsibility === 'MULTI_DROP') {
      classificationLevel = 'GRADE_4'
      rationale = 'Grade 4 — heavy rigid vehicle with dangerous goods or complex multi-drop route responsibilities.'
    } else {
      classificationLevel = 'GRADE_3'
      rationale = 'Grade 3 — heavy rigid vehicle (over 15 tonnes GVM, HR licence, 3+ axles).'
    }
  } else if (vehicle === 'ARTICULATED') {
    vehicleGrade = 'ARTICULATED'
    classificationLevel = responsibility === 'SUPERVISOR' ? 'GRADE_5' : 'GRADE_4'
    rationale = classificationLevel === 'GRADE_5'
      ? 'Grade 5 — articulated vehicle with leading hand / supervisor responsibilities.'
      : 'Grade 4 — articulated vehicle (semi-trailer, HC licence).'
  } else {
    // COMBINATION
    vehicleGrade = 'COMBINATION'
    classificationLevel = 'GRADE_5'
    rationale = 'Grade 5 — multi-combination vehicle (B-double, road train, MC licence). This is the highest classification grade.'
  }

  return { awardCode, awardName, classificationLevel, vehicleGrade, rationale }
}

const GRADE_LABELS: Record<string, string> = {
  GRADE_1: 'Grade 1',
  GRADE_2: 'Grade 2',
  GRADE_3: 'Grade 3',
  GRADE_4: 'Grade 4',
  GRADE_5: 'Grade 5',
}

type Step = 'vehicle' | 'route' | 'responsibility' | 'result'

export function AwardWizard({ open, onClose, onAccept }: Props) {
  const [step, setStep] = useState<Step>('vehicle')
  const [vehicle, setVehicle] = useState<VehicleAnswer | null>(null)
  const [route, setRoute] = useState<RouteAnswer | null>(null)
  const [responsibility, setResponsibility] = useState<ResponsibilityAnswer | null>(null)

  const recommendation =
    vehicle && route && responsibility
      ? getRecommendation(vehicle, route, responsibility)
      : null

  function reset() {
    setStep('vehicle')
    setVehicle(null)
    setRoute(null)
    setResponsibility(null)
  }

  function handleClose() {
    reset()
    onClose()
  }

  function handleAccept() {
    if (!recommendation) return
    onAccept(recommendation)
    reset()
    onClose()
  }

  const progress = { vehicle: 1, route: 2, responsibility: 3, result: 4 }[step]

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) handleClose() }}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Truck className="h-5 w-5 text-blue-600" />
            Award &amp; Classification Wizard
          </DialogTitle>
        </DialogHeader>

        {/* Progress */}
        <div className="flex items-center gap-1 mb-2">
          {[1, 2, 3, 4].map(n => (
            <div key={n} className={`h-1.5 flex-1 rounded-full transition-colors ${n <= progress ? 'bg-blue-600' : 'bg-slate-200'}`} />
          ))}
        </div>
        <p className="text-xs text-muted-foreground mb-4">Step {progress} of 4</p>

        {/* Step: Vehicle */}
        {step === 'vehicle' && (
          <div className="space-y-3">
            <p className="font-medium text-sm">What type of vehicle does this employee primarily drive?</p>
            {VEHICLE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => {
                  setVehicle(opt.value)
                  // Skip route question for non-drivers
                  if (opt.value === 'NO_VEHICLE') {
                    setRoute('LOCAL')
                    setResponsibility('BASIC')
                    setStep('result')
                  } else {
                    setStep('route')
                  }
                }}
                className={`w-full text-left rounded-lg border-2 px-4 py-3 transition-colors hover:border-blue-400 hover:bg-blue-50 ${vehicle === opt.value ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}
              >
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
              </button>
            ))}
          </div>
        )}

        {/* Step: Route */}
        {step === 'route' && (
          <div className="space-y-3">
            <p className="font-medium text-sm">What type of routes does this employee typically run?</p>
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2 text-xs text-blue-800 flex gap-2">
              <Info className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              This determines whether MA000038 (local distribution) or MA000039 (long distance operations) applies. The wrong award can expose you to underpayment claims.
            </div>
            {ROUTE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setRoute(opt.value); setStep('responsibility') }}
                className={`w-full text-left rounded-lg border-2 px-4 py-3 transition-colors hover:border-blue-400 hover:bg-blue-50 ${route === opt.value ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}
              >
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
              </button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setStep('vehicle')} className="mt-1">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>
        )}

        {/* Step: Responsibilities */}
        {step === 'responsibility' && (
          <div className="space-y-3">
            <p className="font-medium text-sm">Which best describes their additional responsibilities?</p>
            {RESPONSIBILITY_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => { setResponsibility(opt.value); setStep('result') }}
                className={`w-full text-left rounded-lg border-2 px-4 py-3 transition-colors hover:border-blue-400 hover:bg-blue-50 ${responsibility === opt.value ? 'border-blue-600 bg-blue-50' : 'border-slate-200'}`}
              >
                <p className="font-medium text-sm">{opt.label}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{opt.description}</p>
              </button>
            ))}
            <Button variant="ghost" size="sm" onClick={() => setStep('route')} className="mt-1">
              <ChevronLeft className="h-4 w-4 mr-1" /> Back
            </Button>
          </div>
        )}

        {/* Step: Result */}
        {step === 'result' && recommendation && (
          <div className="space-y-4">
            <div className="rounded-lg border-2 border-green-200 bg-green-50 p-4 space-y-2">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-600" />
                <p className="font-semibold text-green-800">Recommended classification</p>
              </div>
              <div className="space-y-1 text-sm">
                <p><span className="text-muted-foreground">Award:</span> <strong>{recommendation.awardName}</strong></p>
                <p><span className="text-muted-foreground">Grade:</span> <strong>{GRADE_LABELS[recommendation.classificationLevel]}</strong></p>
                {recommendation.vehicleGrade && (
                  <p><span className="text-muted-foreground">Vehicle type:</span> <strong>{recommendation.vehicleGrade.replace('_', ' ')}</strong></p>
                )}
              </div>
            </div>

            <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p className="font-medium mb-1 flex items-center gap-1.5"><HelpCircle className="h-4 w-4 text-slate-400" /> Why this grade?</p>
              <p className="text-muted-foreground leading-relaxed">{recommendation.rationale}</p>
            </div>

            <p className="text-xs text-muted-foreground">
              This recommendation is a guide only. Always verify against the applicable Modern Award or Enterprise Agreement. Classifications can be adjusted after creation.
            </p>

            <div className="flex justify-between pt-1">
              <Button variant="ghost" size="sm" onClick={() => { reset(); setStep('vehicle') }}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Start again
              </Button>
              <Button onClick={handleAccept}>
                Use this classification
                <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}

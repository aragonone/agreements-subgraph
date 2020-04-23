import { Agreement, ERC20 } from '../types/schema'
import { ERC20 as ERC20Contract } from '../types/templates/Agreement/ERC20'
import { BigInt, Address, EthereumEvent } from '@graphprotocol/graph-ts'
import { Action, Setting, Challenge, TokenBalancePermission, Dispute, Evidence, Signer } from '../types/schema'
import {
  Agreement as AgreementApp,
  ActionScheduled,
  ActionChallenged,
  ActionSettled,
  ActionDisputed,
  ActionAccepted,
  ActionVoided,
  ActionRejected,
  ActionCancelled,
  ActionExecuted,
  EvidenceSubmitted,
  BalanceStaked,
  BalanceLocked,
  BalanceChallenged,
  BalanceUnstaked,
  BalanceUnchallenged,
  BalanceSlashed,
  BalanceUnlocked,
  SettingChanged,
  TokenBalancePermissionChanged
} from '../types/templates/Agreement/Agreement'

export function handleActionScheduled(event: ActionScheduled): void {
  let actionId = buildActionId(event.address, event.params.actionId)
  let agreementApp = AgreementApp.bind(event.address)

  let action = new Action(actionId)
  let actionData = agreementApp.getAction(event.params.actionId)
  action.actionId = event.params.actionId
  action.script = actionData.value0
  action.context = actionData.value1
  action.state = castActionState(actionData.value2)
  action.challengeEndDate = actionData.value3
  action.submitter = buildSignerId(event.address, actionData.value4)
  action.setting = buildSettingId(event.address, actionData.value5)
  action.createdAt = event.block.timestamp
  action.save()
}

export function handleActionChallenged(event: ActionChallenged): void {
  let actionId = buildActionId(event.address, event.params.actionId)
  let agreementApp = AgreementApp.bind(event.address)

  let action = Action.load(actionId)
  let actionData = agreementApp.getAction(event.params.actionId)
  action.state = castActionState(actionData.value2)
  action.save()

  let challenge = new Challenge(actionId)
  let challengeData = agreementApp.getChallenge(event.params.actionId)
  challenge.action = actionId
  challenge.context = challengeData.value0
  challenge.settlementEndDate = challengeData.value1
  challenge.challenger = challengeData.value2
  challenge.settlementOffer = challengeData.value3
  challenge.arbitratorFeeAmount = challengeData.value4
  challenge.arbitratorFeeToken = buildERC20(challengeData.value5)
  challenge.state = castChallengeState(challengeData.value6)
  challenge.createdAt = event.block.timestamp
  challenge.save()
}

export function handleActionSettled(event: ActionSettled): void {
  updateChallengeState(event.address, event.params.actionId)
}

export function handleActionDisputed(event: ActionDisputed): void {
  updateChallengeState(event.address, event.params.actionId)

  let agreementApp = AgreementApp.bind(event.address)
  let disputeData = agreementApp.getDispute(event.params.actionId)

  let dispute = new Dispute(buildDisputeId(event.address, event.params.disputeId))
  dispute.ruling = disputeData.value0
  dispute.challenge = buildActionId(event.address, event.params.actionId)
  dispute.disputeId = event.params.disputeId
  dispute.submitterFinishedEvidence = disputeData.value1
  dispute.challengerFinishedEvidence = disputeData.value2
  dispute.createdAt = event.block.timestamp
  dispute.save()
}

export function handleEvidenceSubmitted(event: EvidenceSubmitted): void {
  let evidenceId = buildId(event)
  let evidence = new Evidence(evidenceId)
  evidence.data = event.params.evidence
  evidence.dispute = buildDisputeId(event.address, event.params.disputeId)
  evidence.submitter = event.params.submitter
  evidence.createdAt = event.block.timestamp
  evidence.save()
}

export function handleActionAccepted(event: ActionAccepted): void {
  updateChallengeState(event.address, event.params.actionId)
  updateDisputeState(event.address, event.params.actionId)
}

export function handleActionVoided(event: ActionVoided): void {
  updateChallengeState(event.address, event.params.actionId)
  updateDisputeState(event.address, event.params.actionId)
}

export function handleActionRejected(event: ActionRejected): void {
  updateChallengeState(event.address, event.params.actionId)
  updateDisputeState(event.address, event.params.actionId)
}

export function handleActionCancelled(event: ActionCancelled): void {
  updateActionState(event.address, event.params.actionId)
}

export function handleActionExecuted(event: ActionExecuted): void {
  updateActionState(event.address, event.params.actionId)
}

export function handleBalanceStaked(event: BalanceStaked): void {
  let signer = loadOrCreateSigner(event.address, event.params.signer)
  signer.available = signer.available.plus(event.params.amount)
  signer.save()
}

export function handleBalanceUnstaked(event: BalanceUnstaked): void {
  let signer = loadOrCreateSigner(event.address, event.params.signer)
  signer.available = signer.available.minus(event.params.amount)
  signer.save()
}

export function handleBalanceLocked(event: BalanceLocked): void {
  let signer = loadOrCreateSigner(event.address, event.params.signer)
  signer.available = signer.available.minus(event.params.amount)
  signer.locked = signer.locked.plus(event.params.amount)
  signer.save()
}

export function handleBalanceUnlocked(event: BalanceUnlocked): void {
  let signer = loadOrCreateSigner(event.address, event.params.signer)
  signer.locked = signer.locked.minus(event.params.amount)
  signer.available = signer.available.plus(event.params.amount)
  signer.save()
}

export function handleBalanceChallenged(event: BalanceChallenged): void {
  let signer = loadOrCreateSigner(event.address, event.params.signer)
  signer.locked = signer.locked.minus(event.params.amount)
  signer.challenged = signer.challenged.plus(event.params.amount)
  signer.save()
}

export function handleBalanceUnchallenged(event: BalanceUnchallenged): void {
  let signer = loadOrCreateSigner(event.address, event.params.signer)
  signer.challenged = signer.challenged.minus(event.params.amount)
  signer.available = signer.available.plus(event.params.amount)
  signer.save()
}

export function handleBalanceSlashed(event: BalanceSlashed): void {
  let signer = loadOrCreateSigner(event.address, event.params.signer)
  signer.challenged = signer.challenged.minus(event.params.amount)
  signer.save()
}

export function handleSettingChanged(event: SettingChanged): void {
  let agreementApp = AgreementApp.bind(event.address)
  let settingData = agreementApp.getSetting(event.params.settingId)

  let currentSettingId = buildSettingId(event.address, event.params.settingId)
  let setting = new Setting(currentSettingId)
  setting.settingId = event.params.settingId
  setting.content = settingData.value0
  setting.delayPeriod = settingData.value1
  setting.settlementPeriod = settingData.value2
  setting.collateralAmount = settingData.value3
  setting.challengeCollateral = settingData.value4
  setting.save()

  let agreement = Agreement.load(event.address.toHex())
  agreement.title = agreementApp.title()
  agreement.arbitrator = agreementApp.arbitrator()
  agreement.currentSetting = currentSettingId
  agreement.collateralToken = buildERC20(agreementApp.collateralToken())
  agreement.save()
}

export function handleTokenBalancePermissionChanged(event: TokenBalancePermissionChanged): void {
  if (event.params.token.toHexString() != '0x0000000000000000000000000000000000000000') {
    let permission = new TokenBalancePermission('0')
    permission.token = buildERC20(event.params.token)
    permission.balance = event.params.balance
    permission.save()

    let agreement = Agreement.load(event.address.toHex())
    agreement.tokenBalancePermission = '0'
    agreement.save()
  }
}

function loadOrCreateSigner(agreement: Address, signerAddress: Address): Signer | null {
  let signerId = buildSignerId(agreement, signerAddress)
  let signer = Signer.load(signerId)
  if (signer === null) {
    signer = new Signer(signerId)
    signer.address = signerAddress
    signer.available = new BigInt(0)
    signer.locked = new BigInt(0)
    signer.challenged = new BigInt(0)
  }
  return signer
}

function updateActionState(agreement: Address, actionId: BigInt): void {
  let agreementApp = AgreementApp.bind(agreement)
  let actionData = agreementApp.getAction(actionId)

  let action = Action.load(buildActionId(agreement, actionId))
  action.state = castActionState(actionData.value2)
  action.save()
}

function updateChallengeState(agreement: Address, actionId: BigInt): void {
  let agreementApp = AgreementApp.bind(agreement)
  let challengeData = agreementApp.getChallenge(actionId)

  let challenge = Challenge.load(buildActionId(agreement, actionId))
  challenge.state = castChallengeState(challengeData.value6)
  challenge.save()
}

function updateDisputeState(agreement: Address, actionId: BigInt): void {
  let agreementApp = AgreementApp.bind(agreement)
  let disputeData = agreementApp.getDispute(actionId)

  let dispute = Dispute.load(buildActionId(agreement, actionId))
  dispute.ruling = disputeData.value0
  dispute.submitterFinishedEvidence = disputeData.value1
  dispute.challengerFinishedEvidence = disputeData.value2
  dispute.save()
}

function buildERC20(address: Address): string {
  let id = address.toHex()
  let token = ERC20.load(id)

  if (token === null) {
    let tokenContract = ERC20Contract.bind(address)
    token = new ERC20(id)
    token.name = tokenContract.name()
    token.symbol = tokenContract.symbol()
    token.decimals = tokenContract.decimals()
    token.save()
  }

  return token.id
}

function buildSignerId(agreement: Address, signer: Address): string {
  return agreement.toHex() + "-signer-" + signer.toHex()
}

function buildActionId(agreement: Address, actionId: BigInt): string {
  return agreement.toHex() + "-action-" + actionId.toString()
}

function buildDisputeId(agreement: Address, disputeId: BigInt): string {
  return agreement.toHex() + "-setting-" + disputeId.toString()
}

function buildSettingId(agreement: Address, settingId: BigInt): string {
  return agreement.toHex() + "-dispute-" + settingId.toString()
}

export function buildId(event: EthereumEvent): string {
  return event.transaction.hash.toHex() + event.logIndex.toString()
}

function castActionState(state: i32): string {
  switch (state) {
    case 0: return 'Scheduled'
    case 1: return 'Challenged'
    case 2: return 'Executed'
    case 3: return 'Cancelled'
    default: return 'Unknown'
  }
}

function castChallengeState(state: i32): string {
  switch (state) {
    case 0: return 'Waiting'
    case 1: return 'Settled'
    case 2: return 'Disputed'
    case 3: return 'Rejected'
    case 4: return 'Accepted'
    case 5: return 'Voided'
    default: return 'Unknown'
  }
}

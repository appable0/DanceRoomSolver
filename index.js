/// <reference types="../CTAutocomplete" />

import PogObject from "../PogData"
let settings = new PogObject("DanceRoomSolver", { firstTime: true, volume: 1.0, recordVolume: 1.0 }, "settings.json")

// Expose mouse click method click
let clickMouseMethod = Client.getMinecraft().class.getDeclaredMethod("func_147116_af") 
clickMouseMethod.setAccessible(true)

const clickMouse = () => {
  clickMouseMethod.invoke(Client.getMinecraft())
}

// Mirrorverse data
const xStart = -266
const xEnd = -262
const zStart = -109
const zEnd = -105
const pitchList = [0.523809552192688, 1.047619104385376, 0.6984127163887024, 0.8888888955116272]
const completePitch = 0.7460317611694336
const jumpDelay = 500
const punchDelay = 800

const SoundCategory = Java.type("net.minecraft.client.audio.SoundCategory")

// Blocks
const Blocks = Java.type("net.minecraft.init.Blocks")
const guardBlock = Blocks.field_180401_cv
const air = Blocks.field_150350_a

// Key bindings
const KeyBinding = Java.type("net.minecraft.client.settings.KeyBinding")
const gameSettings = Client.getSettings().getSettings()

const KeyBindings = {
  Forward: gameSettings.field_74351_w,
  Backward: gameSettings.field_74368_y,
  Left: gameSettings.field_74370_x,
  Right: gameSettings.field_74366_z,
  Sneak: gameSettings.field_74311_E,
  Jump: gameSettings.field_74314_A
}

// State
let beats = 0
let isActive = false
let inMirrorverse = false

// Raw set key state
const setKeyState = (keyBind, state) => {
  KeyBinding.func_74510_a(keyBind.func_151463_i(), state)
}

// Sets new direction and turns off previous keybind
const setDirection = (() => {
  let currentKeyBind = null
  return (newKeyBind) => {
    if (currentKeyBind != null) setKeyState(currentKeyBind, false)
    if (newKeyBind != null) setKeyState(newKeyBind, true)
    currentKeyBind = newKeyBind
  }
})()

// Set proper rotation for dance floor
const setRotation = () => {
  Player.getPlayer().func_70080_a(Player.getX(), Player.getY(), Player.getZ(), 90, 90)
}

// Set guard blocks to prevent solver from walking too far
const toggleGuardBlocks = (active) => {
  const world = World.getWorld()
  const block = active ? guardBlock : air
  for (x = xStart; x <= xEnd; x++) {
    for (z = zStart; z <= zEnd; z++) {
      for (y = 33; y <= 34; y++) {
        if (x === xStart || x === xEnd || z === zStart || z === zEnd) {
          let blockPos = new BlockPos(x, y, z).toMCBlock()
          world.func_175656_a(blockPos, block.func_176223_P())
        }
      }
    }
  }
}

// Manage state for when solver is activated or inactived
const setInactive = () => {
  isActive = false
  beats = 0
  setDirection(null)
  setKeyState(KeyBindings.Sneak, false)
  setKeyState(KeyBindings.Jump, false)
  toggleGuardBlocks(false)
  Client.getSettings().getSettings().func_151439_a(SoundCategory.MASTER, settings.volume)
}

const setActive = () => {
  settings.volume = Client.getSettings().getSettings().func_151438_a(SoundCategory.MASTER)
  if (settings.volume == 0) {
    ChatLib.chat("&e&oTemporarily turning volume on because your volume was off!")
    Client.getSettings().getSettings().func_151439_a(SoundCategory.MASTER, 0.01)
  }
  settings.save()
  isActive = true
  setRotation()
  toggleGuardBlocks(true)
  doMove(0)
}

// Movement logic defined by the beat
const doMove = (beat) => {
  let status = []

  if (beat == 0 || beat % 2 == 1) {
    status.push("moving")
    const index = Math.ceil(beat / 2) % 4
    const cycle = [KeyBindings.Left, KeyBindings.Backward, KeyBindings.Right, KeyBindings.Forward]
    setDirection(cycle[index])
  }

  if (beat >= 8) {
    if (beat % 4 == 0) {
      status.push("sneaking")
      setKeyState(KeyBindings.Sneak, true)
    } else if (beat % 4 == 1) {
      status.push("unsneaking")
      setKeyState(KeyBindings.Sneak, false)
    }
  }

  if (beat >= 24) {
    if (beat % 8 == 0 || beat % 8 == 2) {
      status.push("jumping")
      new Thread(() => {
        Thread.sleep(jumpDelay)
        setKeyState(KeyBindings.Jump, true)
        Thread.sleep(100)
        setKeyState(KeyBindings.Jump, false)
      }).start()
    }
  }

  if (beat >= 64) {
    if (beat % 2 == 0) {
      status.push("punching")
      new Thread(() => {
        Thread.sleep(punchDelay)
        clickMouse()
      }).start()
    }
  }

  statusString = `Beat ${beat}`
  if (status.length > 0) statusString += `: ${status.join(", ")}`
  ChatLib.chat(`&7${statusString}.`)
}

// Only try to do anything when in the Mirrorverse
register("step", () => {
  inMirrorverse = Scoreboard.getLines().some(line => (
    ChatLib.removeFormatting(line.getName()).replace(/[^\x00-\x7F]/g, "").trim() == "Mirrorverse"
  ))
  if (inMirrorverse && settings.firstTime) {
    const lineBreak = ChatLib.getChatBreak("&a&m-")
    ChatLib.chat(lineBreak)
    ChatLib.chat("&aThanks for downloading &b&lDanceRoomSolver&r&a!\n")
    ChatLib.chat("&7To use, stand on the &agreen block &7in the &dDance Room&7.")
    ChatLib.chat("&7The solver will run automagically.")
    ChatLib.chat(lineBreak)
    settings.firstTime = false
    settings.save()
  }
}).setDelay(3)

// Determine whether solver should be active based on title text
register("renderTitle", (title, subtitle, event) => {
  if (!inMirrorverse) return
  if (subtitle != "§bMove!§r") return
  if (!isActive) {
    ChatLib.chat("&b&lAmbient &7» &bDance Room Solver Enabled!")
    setActive()
  }
})

// Turn off if you move your mouse
register("tick", () => {
  if (isActive && (Player.getYaw() != 90 || Player.getPitch() != 90)) {
    ChatLib.chat("&b&lAmbient &7» &cCancelled because you moved your mouse!")
    setInactive()
  }
})

// Determine beats and overall status using sounds
register("soundPlay", (position, name, vol, pitch) => {
  if (!inMirrorverse || !isActive) return
  if (name == "random.burp") {
    ChatLib.chat("&b&lAmbient &7» &cFailed! Toggling off.")
    setInactive()
  } else if (name == "note.bassattack" && vol == 1.0) {
    if (pitchList.includes(pitch)) {
      beats++
      doMove(beats)
    } else if (pitch == completePitch) {
      ChatLib.chat("&b&lAmbient &7» &aCompleted! Toggling off.")
      setInactive()
    }
  }
})

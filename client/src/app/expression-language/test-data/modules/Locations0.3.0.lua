Locations = {
    diffractionBaselines = {
      Ca_Ka = {
        start = 445,
        stop = 495
      },
      Ca_Kb = {
        start = 497,
        stop = 535
      },
      Fe_Ka = {
        start =779,
        stop = 852
      },
      Fe_Kb = {
        start = 866,
        stop = 929
      },
      Si_K = {
        start = 207,
        stop = 245
      }
    },
  
    backgrounds = {
      Rh_full = {
        start = 333,
        stop = 395,
        range = 3.092 - 2.596
      },
      Rh_shoulder = {
        start = 377,
        stop = 394,
        range = 3.084 - 2.948
      },
      Cr_bckgd = {
        start = 719,
        stop = 734,
        range = 5.804 - 5.684
      },
      HighE1 = {
        start = 1168,
        stop = 1217,
        range = (12.468 - 9.276)/8
      },
      HighE2 = {
        start = 1218,
        stop = 1267,
        range = (12.468 - 9.276)/8
      },
      HighE3 = {
        start = 1268,
        stop = 1317,
        range = (12.468 - 9.276)/8
      },
      HighE4 = {
        start = 1318,
        stop = 1367,
        range = (12.468 - 9.276)/8
      },
      HighE5 = {
        start = 1368,
        stop = 1417,
        range = (12.468 - 9.276)/8
      },
      HighE6 = {
        start = 1418,
        stop = 1467,
        range = (12.468 - 9.276)/8
      },
      HighE7 = {
        start = 1468,
        stop = 1517,
        range = (12.468 - 9.276)/8
      },
      HighE8 = {
        start = 1518,
        stop = 1567,
        range = (12.468 - 9.276)/8
      }
    },
  
    mainPeaks = {
      Na = {
        start = 104,
        stop = 137
      },
      Mg = {
        start = 141,
        stop = 176
      },
      Al = {
        start = 179,
        stop = 201
      },
      Si = {
        start = 201,
        stop = 246
      },
      P = {
        start = 250,
        stop = 272
      },
      S = {
        start = 274,
        stop = 314
      },
      Cl = {
        start = 313,
        stop = 376
      },
      K = {
        start = 404,
        stop = 440
      },
      Ca = {
        start = 443,
        stop = 496
      },
      Ti = {
        start = 552,
        stop = 613
      },
      Cr = {
        start = 660,
        stop = 719
      },
      Mn = {
        start = 719,
        stop = 777
      },
      Fe = {
        start = 783,
        stop = 857
      },
      Ni = {
        start = 935,
        stop = 982
      },
      Zn = {
        start = 1083,
        stop = 1123
      },
      Ge = {
        start = 1220,
        stop = 1265
      },
      As = {
        start = 1301,
        stop = 1346
      },
      Rb = {
        start = 1676,
        stop = 1731
      },
      Sr = {
        start = 1770,
        stop = 1834
      },
      Zr = {
        start = 1974,
        stop = 2032
      },
      Y = {
        start = 1882,
        stop = 1925
      },
      Br = {
        start = 1492,
        stop = 1539
      }
    }
  }
  
  function Locations.getHighE()
    result = {}
    for k, interval in pairs(Locations.backgrounds) do
      if k:sub(1, 5) == "HighE" then
        table.insert(result, interval)
      end
    end
    return result
  end
  
return Locations
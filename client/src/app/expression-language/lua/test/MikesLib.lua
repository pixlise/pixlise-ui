-- Mikes "Total (wt%)" code in a lib. Exact "transpile" from original PIXLISE expression
-- NOTE: Transpiler had to generate globals because there are > 200 local variables in this!

MikesLib = {}

function MikesLib.TotalFunc(Map)
------------------------ Mikes code starts on the following line ------------------------
    -- Estimates analytical total based on calibrated abundances on a flat surface
    -- from an arbitrary PIXL target. Corrects for geometric and diffraction
    -- effects. Does not attempt to correct for roughness at scales finer than the
    -- analytical spot.

    -- Lines 5-131 include a lot of constant definitions necessary for this routine.
    -- Do not modify unless you know what you're doing!

    -- ***Parameters for identifying diffraction peaks***
    -- ML = 0 does not use machine learning; ML = 1 does
    tolerance = 0.4
    scale = 5
    ML = 1
    -- ***End parms for identifying diffraction peaks***

    -- ***Parameters for geometric corrections***
    sigma_cutoff = 5              -- N*sigma cutoff for comparing count ratios
    var_cutoff = sigma_cutoff^2
    cos_phi0 = 0.9397           -- phi0 = angle between source and detectors
    tan_phi0 = 0.3640
    -- ***End parms for geometric corrections***

    -- ***Constants for expression language hacks***
    -- For converting numbers to maps when required by expressions
    unit = makeMap(1)
    -- ***End consts for expression language hacks***

    -- ***Spectral locations library version 1.0***
    -- Roughness correction locations
    Ca_Ka_start = 445
    Ca_Ka_end = 495
    Ca_Kb_start = 497
    Ca_Kb_end = 535
    Fe_Ka_start = 779
    Fe_Ka_end = 852
    Fe_Kb_start = 866
    Fe_Kb_end = 929
    Si_K_start = 207
    Si_K_end = 245

    -- Useful scattering locations
    Rh_full_start = 333
    Rh_full_end = 395
    Rh_full_range = (2.95 - 2.46)
    Rh_shoulder_start = 377
    Rh_shoulder_end = 394
    Rh_shoulder_range = (2.940 - 2.806)
    Cr_bckgd_start = 719
    Cr_bckgd_end = 734
    Cr_bckgd_range = (5.616 - 5.498)
    High_E1_start = 1168
    High_E1_end = 1217
    High_E2_start = 1218
    High_E2_end = 1267
    High_E3_start = 1268
    High_E3_end = 1317
    High_E4_start = 1318
    High_E4_end = 1367
    High_E5_start = 1368
    High_E5_end = 1417
    High_E6_start = 1418
    High_E6_end = 1467
    High_E7_start = 1468
    High_E7_end = 1517
    High_E8_start = 1518
    High_E8_end = 1583
    High_E_range = (12.44 - 9.17)

    -- Elemental fluorescence peak locations
    Na_start = 104
    Na_end = 137
    Mg_start = 141
    Mg_end = 176
    Al_start = 179
    Al_end = 201
    Si_start = 201
    Si_end = 246
    P_start = 250
    P_end = 272
    S_start = 274
    S_end = 314
    Cl_start = 313
    Cl_end = 376
    K_start = 404
    K_end = 440
    Ca_start = 443
    Ca_end = 496
    Ti_start = 552
    Ti_end = 613
    Cr_start = 660
    Cr_end = 719
    Mn_start = 719
    Mn_end = 777
    Fe_start = 783
    Fe_end = 857
    Ni_start = 935
    Ni_end = 982
    Zn_start = 1083
    Zn_end = 1123
    Rb_start = 1676
    Rb_end = 1731
    Sr_start = 1770
    Sr_end = 1834
    Zr_start = 1974
    Zr_end = 2032
    Y_start = 1882
    Y_end = 1925
    Br_start = 1492
    Br_end = 1539

    -- Atomic masses
    nC = 12.01
    nO = 16
    nNa = 22.99
    nMg = 24.31
    nAl = 26.98
    nSi = 28.09
    nP = 30.97
    nS = 32.07
    nCl = 35.45
    nK = 39.1
    nCa = 40.08
    nTi = 47.87
    nCr = 52
    nMn = 54.94
    nFe = 55.85
    nNi = 58.69
    nZn = 65.38
    nRb = 85.47
    nSr = 87.62
    nZr = 91.22
    nY = 88.91
    nBr = 79.9
    -- ***End spectral locations library***

    -- ***Set parameters for estimating local geometric effects***
    -- Estimates overall geometric effect on detectors A and B.

    -- ***Get intensities***
    X_start = High_E1_start  -- Insert start energy channel
    X_end = High_E1_end    -- Insert end energy channel

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    R = Map.div(I_B, I_A)
    e = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))
    s = Map.mul(2, Map.pow(Map.div(Map.mul(I_A, I_B), Map.pow(Map.add(I_A, I_B), 3)), 0.5))

    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))  -- Machine learning method
    -- ***End get intensities***
    A1 = I_A
    B1 = I_B
    R1 = R
    e1 = e
    s1 = s
    ML1 = diff_ML

    -- ***Get intensities***
    X_start = High_E2_start  -- Insert start energy channel
    X_end = High_E2_end    -- Insert end energy channel

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    R = Map.div(I_B, I_A)
    e = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))
    s = Map.mul(2, Map.pow(Map.div(Map.mul(I_A, I_B), Map.pow(Map.add(I_A, I_B), 3)), 0.5))

    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))  -- Machine learning method
    -- ***End get intensities***
    A2 = I_A
    B2 = I_B
    R2 = R
    e2 = e
    s2 = s
    ML2 = diff_ML

    -- ***Get intensities***
    X_start = High_E3_start  -- Insert start energy channel
    X_end = High_E3_end    -- Insert end energy channel

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    R = Map.div(I_B, I_A)
    e = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))
    s = Map.mul(2, Map.pow(Map.div(Map.mul(I_A, I_B), Map.pow(Map.add(I_A, I_B), 3)), 0.5))

    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))  -- Machine learning method
    -- ***End get intensities***
    A3 = I_A
    B3 = I_B
    R3 = R
    e3 = e
    s3 = s
    ML3 = diff_ML

    -- ***Get intensities***
    X_start = High_E4_start  -- Insert start energy channel
    X_end = High_E4_end    -- Insert end energy channel

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    R = Map.div(I_B, I_A)
    e = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))
    s = Map.mul(2, Map.pow(Map.div(Map.mul(I_A, I_B), Map.pow(Map.add(I_A, I_B), 3)), 0.5))

    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))  -- Machine learning method
    -- ***End get intensities***
    A4 = I_A
    B4 = I_B
    R4 = R
    e4 = e
    s4 = s
    ML4 = diff_ML

    -- ***Get intensities***
    X_start = High_E5_start  -- Insert start energy channel
    X_end = High_E5_end    -- Insert end energy channel

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    R = Map.div(I_B, I_A)
    e = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))
    s = Map.mul(2, Map.pow(Map.div(Map.mul(I_A, I_B), Map.pow(Map.add(I_A, I_B), 3)), 0.5))

    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))  -- Machine learning method
    -- ***End get intensities***
    A5 = I_A
    B5 = I_B
    R5 = R
    e5 = e
    s5 = s
    ML5 = diff_ML

    -- ***Get intensities***
    X_start = High_E6_start  -- Insert start energy channel
    X_end = High_E6_end    -- Insert end energy channel

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    R = Map.div(I_B, I_A)
    e = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))
    s = Map.mul(2, Map.pow(Map.div(Map.mul(I_A, I_B), Map.pow(Map.add(I_A, I_B), 3)), 0.5))

    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))  -- Machine learning method
    -- ***End get intensities***
    A6 = I_A
    B6 = I_B
    R6 = R
    e6 = e
    s6 = s
    ML6 = diff_ML

    -- ***Get intensities***
    X_start = High_E7_start  -- Insert start energy channel
    X_end = High_E7_end    -- Insert end energy channel

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    R = Map.div(I_B, I_A)
    e = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))

    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))  -- Machine learning method
    -- ***End get intensities***
    A7 = I_A
    B7 = I_B
    R7 = R
    e7 = e
    s7 = s
    ML7 = diff_ML

    -- ***Get intensities***
    X_start = High_E8_start  -- Insert start energy channel
    X_end = High_E8_end    -- Insert end energy channel

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    R = Map.div(I_B, I_A)
    e = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))
    s = Map.mul(2, Map.pow(Map.div(Map.mul(I_A, I_B), Map.pow(Map.add(I_A, I_B), 3)), 0.5))

    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))  -- Machine learning method
    -- ***End get intensities***
    A8 = I_A
    B8 = I_B
    R8 = R
    e8 = e
    s8 = s
    ML8 = diff_ML

    Ai = Map.add(Map.add(Map.add(Map.add(A1, A2), A3), A4), A5)
    Ai = Map.add(Map.add(Map.add(Ai, A6), A7), A8)
    Bi = Map.add(Map.add(Map.add(Map.add(B1, B2), B3), B4), B5)
    Bi = Map.add(Map.add(Map.add(Bi, B6), B7), B8)
    ei = Map.div(Map.sub(Ai, Bi), Map.add(Ai, Bi))
    si = Map.mul(2, Map.pow(Map.div(Map.mul(Ai, Bi), Map.pow(Map.add(Ai, Bi), 3)), 0.5))

    a1 = Map.under(Map.div(Map.pow(Map.sub(e1, ei), 2), Map.add(Map.mul(s1, s1), Map.mul(si, si))), var_cutoff)
    a2 = Map.under(Map.div(Map.pow(Map.sub(e2, ei), 2), Map.add(Map.mul(s2, s2), Map.mul(si, si))), var_cutoff)
    a3 = Map.under(Map.div(Map.pow(Map.sub(e3, ei), 2), Map.add(Map.mul(s3, s3), Map.mul(si, si))), var_cutoff)
    a4 = Map.under(Map.div(Map.pow(Map.sub(e4, ei), 2), Map.add(Map.mul(s4, s4), Map.mul(si, si))), var_cutoff)
    a5 = Map.under(Map.div(Map.pow(Map.sub(e5, ei), 2), Map.add(Map.mul(s5, s5), Map.mul(si, si))), var_cutoff)
    a6 = Map.under(Map.div(Map.pow(Map.sub(e6, ei), 2), Map.add(Map.mul(s6, s6), Map.mul(si, si))), var_cutoff)
    a7 = Map.under(Map.div(Map.pow(Map.sub(e7, ei), 2), Map.add(Map.mul(s7, s7), Map.mul(si, si))), var_cutoff)
    a8 = Map.under(Map.div(Map.pow(Map.sub(e8, ei), 2), Map.add(Map.mul(s8, s8), Map.mul(si, si))), var_cutoff)

    A = Map.add(Map.add(Map.add(Map.add(Map.add(Map.add(Map.add(Map.mul(A1, a1), Map.mul(A2, a2)), Map.mul(A3, a3)), Map.mul(A4, a4)), Map.mul(A5, a5)), Map.mul(A6, a6)), Map.mul(A7, a7)), Map.mul(A8, a8))
    B = Map.add(Map.add(Map.add(Map.add(Map.add(Map.add(Map.add(Map.mul(B1, a1), Map.mul(B2, a2)), Map.mul(B3, a3)), Map.mul(B4, a4)), Map.mul(B5, a5)), Map.mul(B6, a6)), Map.mul(B7, a7)), Map.mul(B8, a8))
    ep = Map.div(Map.sub(A, B), Map.add(A, B))
    ep_err = Map.mul(2, Map.pow(Map.div(Map.mul(A, B), Map.pow(Map.add(A, B), 3)), 0.5))
    sign_ep = Map.sub(Map.over(ep, 0), Map.under(ep, 0))

    e0 = Map.add(Map.div(-1, Map.mul((2 * cos_phi0), ep)), Map.mul(sign_ep, Map.pow(Map.add(Map.add(Map.pow(Map.div(1, Map.mul((2 * cos_phi0), ep)), 2), (1 / cos_phi0)), 1), .5)))
    e0_err = Map.div(Map.mul(e0, ep_err), Map.mul(Map.mul(cos_phi0, ep), Map.add((1 / cos_phi0), Map.mul(2, e0))))
    -- ***End set parameters for estimating local geometric effects***

    -- ***Start estimate energy-dependent geometric effects***
    Ca_Aa = spectrum(Ca_Ka_start, Ca_Ka_end, "A")  -- Ca Ka in A
    Ca_Ba = spectrum(Ca_Ka_start, Ca_Ka_end, "B")  -- Ca Ka in B
    Ca_Ab = spectrum(Ca_Kb_start, Ca_Kb_end, "A")  -- Ca Kb in A
    Ca_Bb = spectrum(Ca_Kb_start, Ca_Kb_end, "B")  -- Ca Kb in B

    Ca_ML = Map.sub(1, Map.over(diffractionPeaks(Ca_Ka_start, Ca_Kb_end), 0))

    Fe_Aa = spectrum(Fe_Ka_start, Fe_Ka_end, "A")  -- Fe Ka in A
    Fe_Ba = spectrum(Fe_Ka_start, Fe_Ka_end, "B")  -- Fe Ka in B
    Fe_Ab = spectrum(Fe_Kb_start, Fe_Kb_end, "A")  -- Fe Kb in A
    Fe_Bb = spectrum(Fe_Kb_start, Fe_Kb_end, "B")  -- Fe Kb in B

    Fe_ML = Map.sub(1, Map.over(diffractionPeaks(Fe_Ka_start, Fe_Kb_end), 0))

    Si_A = spectrum(Si_K_start, Si_K_end, "A")  -- Si K in A
    Si_B = spectrum(Si_K_start, Si_K_end, "B")  -- Si K in B

    Si_ML = Map.sub(1, Map.over(diffractionPeaks(Si_K_start, Si_K_end), 0))

    e_Ca_a = Map.div(Map.sub(Ca_Aa, Ca_Ba), Map.add(Ca_Aa, Ca_Ba))
    e_Ca_a_err = Map.mul(2, Map.pow(Map.div(Map.mul(Ca_Aa, Ca_Ba), Map.pow(Map.add(Ca_Aa, Ca_Ba), 3)), 0.5))
    e_Fe_a = Map.div(Map.sub(Fe_Aa, Fe_Ba), Map.add(Fe_Aa, Fe_Ba))
    e_Fe_a_err = Map.mul(2, Map.pow(Map.div(Map.mul(Fe_Aa, Fe_Ba), Map.pow(Map.add(Fe_Aa, Fe_Ba), 3)), 0.5))
    e_Ca_b = Map.div(Map.sub(Ca_Ab, Ca_Bb), Map.add(Ca_Ab, Ca_Bb))
    e_Ca_b_err = Map.mul(2, Map.pow(Map.div(Map.mul(Ca_Ab, Ca_Bb), Map.pow(Map.add(Ca_Ab, Ca_Bb), 3)), 0.5))
    e_Fe_b = Map.div(Map.sub(Fe_Ab, Fe_Bb), Map.add(Fe_Ab, Fe_Bb))
    e_Fe_b_err = Map.mul(2, Map.pow(Map.div(Map.mul(Fe_Ab, Fe_Bb), Map.pow(Map.add(Fe_Ab, Fe_Bb), 3)), 0.5))
    e_Si = Map.div(Map.sub(Si_A, Si_B), Map.add(Si_A, Si_B))
    e_Si_err = Map.mul(2, Map.pow(Map.div(Map.mul(Si_A, Si_B), Map.pow(Map.add(Si_A, Si_B), 3)), 0.5))

    xCa = Map.div(Map.pow(Map.sub(e_Ca_a, e_Ca_b), 2), Map.add(Map.pow(e_Ca_a_err, 2), Map.pow(e_Ca_b_err, 2)))
    lCa_a = Map.div(Map.mul(Map.sub(e_Ca_a, ep), sign_ep), Map.pow(Map.add(Map.pow(e_Ca_a_err, 2), Map.pow(ep_err, 2)), 0.5))
    lCa_b = Map.div(Map.mul(Map.sub(e_Ca_b, ep), sign_ep), Map.pow(Map.add(Map.pow(e_Ca_b_err, 2), Map.pow(ep_err, 2)), 0.5))
    uCa_a = Map.div(Map.mul(Map.sub(e0, e_Ca_a), sign_ep), Map.pow(Map.add(Map.pow(e_Ca_a_err, 2), Map.pow(e0_err, 2)), 0.5))
    uCa_b = Map.div(Map.mul(Map.sub(e0, e_Ca_b), sign_ep), Map.pow(Map.add(Map.pow(e_Ca_b_err, 2), Map.pow(e0_err, 2)), 0.5))
    xFe = Map.div(Map.pow(Map.sub(e_Fe_a, e_Fe_b), 2), Map.add(Map.pow(e_Fe_a_err, 2), Map.pow(e_Fe_b_err, 2)))
    lFe_a = Map.div(Map.mul(Map.sub(e_Fe_a, ep), sign_ep), Map.pow(Map.add(Map.pow(e_Fe_a_err, 2), Map.pow(ep_err, 2)), 0.5))
    lFe_b = Map.div(Map.mul(Map.sub(e_Fe_b, ep), sign_ep), Map.pow(Map.add(Map.pow(e_Fe_b_err, 2), Map.pow(ep_err, 2)), 0.5))
    uFe_a = Map.div(Map.mul(Map.sub(e0, e_Fe_a), sign_ep), Map.pow(Map.add(Map.pow(e_Fe_a_err, 2), Map.pow(e0_err, 2)), 0.5))
    uFe_b = Map.div(Map.mul(Map.sub(e0, e_Fe_b), sign_ep), Map.pow(Map.add(Map.pow(e_Fe_b_err, 2), Map.pow(e0_err, 2)), 0.5))
    lSi = Map.div(Map.sub(e_Si, ep), Map.pow(Map.add(Map.pow(e_Si_err, 2), Map.pow(ep_err, 2)), 0.5))
    uSi = Map.div(Map.mul(Map.sub(e0, e_Si), sign_ep), Map.pow(Map.add(Map.pow(e_Si_err, 2), Map.pow(e0_err, 2)), 0.5))

    use_Ca = Map.under(xCa, var_cutoff)
    use_Ca = Map.mul(Map.mul(use_Ca, Map.over(lCa_a, (0 - sigma_cutoff))), Map.over(lCa_b, (0 - sigma_cutoff)))
    use_Ca = Map.mul(Map.mul(use_Ca, Map.over(uCa_a, (0 - sigma_cutoff))), Map.over(uCa_b, (0 - sigma_cutoff)))
    use_Ca = Map.add(Map.mul((1 - ML), use_Ca), Map.mul(Map.mul(ML, use_Ca), Ca_ML))
    use_Fe = Map.under(xFe, var_cutoff)
    use_Fe = Map.mul(Map.mul(use_Fe, Map.over(lFe_a, (0 - sigma_cutoff))), Map.over(lFe_b, (0 - sigma_cutoff)))
    use_Fe = Map.mul(Map.mul(use_Fe, Map.over(uFe_a, (0 - sigma_cutoff))), Map.over(uFe_b, (0 - sigma_cutoff)))
    use_Fe = Map.add(Map.mul((1 - ML), use_Fe), Map.mul(Map.mul(ML, use_Fe), Fe_ML))
    use_Si = Map.over(lSi, (0 - sigma_cutoff))
    use_Si = Map.mul(use_Si, Map.over(uSi, (0 - sigma_cutoff)))
    use_Si = Map.add(Map.mul((1 - ML), use_Si), Map.mul(Map.mul(ML, use_Si), Si_ML))

    Ca_A = Map.add(Ca_Aa, Ca_Ab)
    Ca_B = Map.add(Ca_Ba, Ca_Bb)
    Fe_A = Map.add(Fe_Aa, Fe_Ab)
    Fe_B = Map.add(Fe_Ba, Fe_Bb)

    A_avg = Map.add(Map.add(Map.mul(use_Ca, Ca_A), Map.mul(use_Fe, Fe_A)), Map.mul(use_Si, Si_A))
    B_avg = Map.add(Map.add(Map.mul(use_Ca, Ca_B), Map.mul(use_Fe, Fe_B)), Map.mul(use_Si, Si_B))

    e_avg = Map.div(Map.sub(A_avg, B_avg), Map.add(A_avg, B_avg))
    e_avg_err = Map.mul(2, Map.pow(Map.div(Map.mul(A_avg, B_avg), Map.pow(Map.add(A_avg, B_avg), 3)), 0.5))
    e_Ca = Map.div(Map.sub(Ca_A, Ca_B), Map.add(Ca_A, Ca_B))
    e_Ca_err = Map.mul(2, Map.pow(Map.div(Map.mul(Ca_A, Ca_B), Map.pow(Map.add(Ca_A, Ca_B), 3)), 0.5))
    e_Fe = Map.div(Map.sub(Fe_A, Fe_B), Map.add(Fe_A, Fe_B))
    e_Fe_err = Map.mul(2, Map.pow(Map.div(Map.mul(Fe_A, Fe_B), Map.pow(Map.add(Fe_A, Fe_B), 3)), 0.5))
    e_Si = Map.div(Map.sub(Si_A, Si_B), Map.add(Si_A, Si_B))
    e_Si_err = Map.mul(2, Map.pow(Map.div(Map.mul(Si_A, Si_B), Map.pow(Map.add(Si_A, Si_B), 3)), 0.5))

    e_Si = Map.add(e_avg, Map.mul(Map.sub(e_Si, e_avg), use_Si))
    e_Si = Map.add(Map.mul(Map.sub(1, use_Si), e_avg_err), Map.mul(use_Si, e_Si_err))
    e_Ca = Map.add(e_avg, Map.mul(Map.sub(e_Ca, e_avg), use_Ca))
    e_Ca_err = Map.add(Map.mul(Map.sub(1, use_Ca), e_avg_err), Map.mul(use_Ca, e_Ca_err))
    e_Fe = Map.add(e_avg, Map.mul(Map.sub(e_Fe, e_avg), use_Fe))
    e_Fe_err = Map.add(Map.mul(Map.sub(1, use_Fe), e_avg_err), Map.mul(use_Fe, e_Fe_err))

    e = e_Si
    e_err = e_Si_err

    -- ***End estimate energy-dependent geometric effects

    TOTAL = 0
    TOTAL_err = 0

    -- ***Estimate calibrated abundance***
    X_start = Na_start  -- Insert start energy channel
    X_end = Na_end    -- Insert end energy channel
    _element = "Na2O"
    mass = ((2 * nNa) + nO)
    wt = 1

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    X_Aq = Map.add(Map.mul(wt, element(_element, "%", "A")), Map.mul((1 - wt), element(_element, "%-as-mmol", "A")))
    X_Bq = Map.add(Map.mul(wt, element(_element, "%", "B")), Map.mul((1 - wt), element(_element, "%-as-mmol", "B")))
    X_Aerr = Map.mul(element(_element, "err", "A"), (wt + (((1 - wt) * 10) / mass)))
    X_Berr = Map.mul(element(_element, "err", "B"), (wt + (((1 - wt) * 10) / mass)))

    midpoint = (0.5 * (X_start + X_end))

    Si_range = Map.under(Map.mul(midpoint, unit), 226)
    SiCa_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (490 - midpoint)), (490 - 226))
    CaSi_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (midpoint - 226)), (490 - 226))
    CaFe_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (854 - midpoint)), (854 - 490))
    FeCa_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (midpoint - 490)), (854 - 490))
    Fe_range = Map.sub(1, Map.under(Map.mul(midpoint, unit), 854))
    e = Map.add(Map.add(Map.mul(e_Si, Map.add(Si_range, SiCa_range)), Map.mul(e_Ca, Map.add(CaSi_range, CaFe_range))), Map.mul(e_Fe, Map.add(FeCa_range, Fe_range)))
    e_var = Map.pow(Map.mul(e_Si_err, Map.add(Si_range, SiCa_range)), 2)
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Ca_err, Map.add(CaSi_range, CaFe_range)), 2))
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Fe_err, Map.add(FeCa_range, Fe_range)), 2))
    e_err = Map.pow(e_var, 0.5)
    use_ep = Map.under(Map.mul(Map.sub(e, ep), sign_ep), 0)
    use_e0 = Map.over(Map.mul(Map.sub(e, e0), sign_ep), 0)
    e = Map.add(Map.add(Map.mul(use_ep, ep), Map.mul(use_e0, Map.add(Map.mul(0.9, e0), Map.mul(0.1, ep)))), Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e))
    e_err = Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e_err)
    e_err = Map.add(Map.add(e_err, Map.mul(use_ep, ep_err)), Map.mul(use_e0, Map.pow(Map.add(Map.pow(Map.mul(0.9, e0_err), 2), Map.pow(Map.mul(0.1, ep_err), 2)), 0.5)))
    R = Map.div(Map.sub(1, e), Map.add(1, e))
    de = Map.div(Map.sub(e0, e), e0)
    beta = Map.add(1, Map.div(Map.mul(Map.mul(Map.mul(e0, e0), de), Map.sub(1, de)), Map.sub(1, Map.mul(Map.mul(e0, e0), Map.sub(1, de)))))

    -- diff = 1 if diffraction present, 0 if not
    e_obs = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))
    e_obs_err = Map.mul(2, Map.pow(Map.div(Map.mul(I_A, I_B), Map.pow(Map.add(I_A, I_B), 3)), 0.5))
    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))                    -- Machine learning method
    diff_r = Map.under(Map.div(Map.pow(Map.sub(e_obs, e), 2), Map.add(Map.pow(e_err, 2), Map.pow(e_obs_err, 2))), sigma_cutoff)  -- Fixed bin method
    diff = Map.add(diff_ML, Map.mul(ML, Map.sub(diff_r, Map.mul(diff_ML, diff_r))))  -- If using machine learning, returns ML || bin result
    diff_in_A = Map.mul(diff, Map.over(Map.sub(e_obs, e), 0))
    diff_in_B = Map.mul(diff, Map.under(Map.sub(e_obs, e), 0))

    -- If diffraction is detected, return the corrected abundance for the "clean" detector
    A_B = Map.div(1, X_Bq)
    A_e = Map.div(Map.add(1, e0), Map.mul(Map.add(1, e), Map.sub(1, Map.mul(e0, e))))
    A_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    B_A = Map.div(1, X_Aq)
    B_e = Map.div(Map.sub(e0, 1), Map.mul(Map.sub(1, e), Map.sub(1, Map.mul(e0, e))))
    B_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    X_Adiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Bq), beta), Map.mul(2, R))
    X_Bdiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Aq), beta), 2)
    X_err_Adiff = Map.mul(X_Adiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(A_B, X_Berr), 2), Map.pow(Map.mul(A_e, e_err), 2)), Map.pow(Map.mul(A_e0, e0_err), 2)), 0.5))
    X_err_Bdiff = Map.mul(X_Bdiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(B_A, X_Aerr), 2), Map.pow(Map.mul(B_e, e_err), 2)), Map.pow(Map.mul(B_e0, e0_err), 2)), 0.5))
    X_diff = Map.add(Map.mul(X_Bdiff, diff_in_B), Map.mul(X_Adiff, diff_in_A))
    X_err_diff = Map.add(Map.mul(X_err_Bdiff, diff_in_B), Map.mul(X_err_Adiff, diff_in_A))

    -- Else, return the corrected abundance derived from both detectors
    C_AB = Map.div(1, Map.add(X_Aq, X_Bq))
    C_e = Map.div(Map.sub(Map.mul(e0, Map.sub(1, Map.mul(e, e))), Map.mul(2, e)), Map.mul(Map.sub(1, Map.mul(e, e)), Map.sub(1, Map.mul(e0, e))))
    C_e0 = Map.div(e0, Map.sub(1, Map.mul(e0, e)))
    X_geom = Map.div(Map.mul(Map.add(X_Aq, X_Bq), beta), 2)
    X_err_geom = Map.mul(X_geom, Map.pow(Map.add(Map.add(Map.add(Map.pow(Map.mul(C_AB, X_Aerr), 2), Map.pow(Map.mul(C_AB, X_Berr), 2)), Map.pow(Map.mul(C_e, e_err), 2)), Map.pow(Map.mul(C_e0, e0_err), 2)), 0.5))

    X = Map.add(Map.mul(diff, X_diff), Map.mul(Map.sub(1, diff), X_geom))
    X_err = Map.add(Map.mul(diff, X_err_diff), Map.mul(Map.sub(1, diff), X_err_geom))
    -- ***End estimate calibrated abundance***
    Na2O = X
    Na2O_err = X_err
    TOTAL = Map.add(TOTAL, Na2O)
    TOTAL_err = Map.pow(Map.add(TOTAL_err^2, Map.pow(Na2O_err, 2)), 0.5)

    -- ***Estimate calibrated abundance***
    X_start = Mg_start  -- Insert start energy channel
    X_end = Mg_end    -- Insert end energy channel
    _element = "MgO"
    mass = (nMg + nO)
    wt = 1

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    X_Aq = Map.add(Map.mul(wt, element(_element, "%", "A")), Map.mul((1 - wt), element(_element, "%-as-mmol", "A")))
    X_Bq = Map.add(Map.mul(wt, element(_element, "%", "B")), Map.mul((1 - wt), element(_element, "%-as-mmol", "B")))
    X_Aerr = Map.mul(element(_element, "err", "A"), (wt + (((1 - wt) * 10) / mass)))
    X_Berr = Map.mul(element(_element, "err", "B"), (wt + (((1 - wt) * 10) / mass)))

    midpoint = (0.5 * (X_start + X_end))

    Si_range = Map.under(Map.mul(midpoint, unit), 226)
    SiCa_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (490 - midpoint)), (490 - 226))
    CaSi_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (midpoint - 226)), (490 - 226))
    CaFe_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (854 - midpoint)), (854 - 490))
    FeCa_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (midpoint - 490)), (854 - 490))
    Fe_range = Map.sub(1, Map.under(Map.mul(midpoint, unit), 854))
    e = Map.add(Map.add(Map.mul(e_Si, Map.add(Si_range, SiCa_range)), Map.mul(e_Ca, Map.add(CaSi_range, CaFe_range))), Map.mul(e_Fe, Map.add(FeCa_range, Fe_range)))
    e_var = Map.pow(Map.mul(e_Si_err, Map.add(Si_range, SiCa_range)), 2)
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Ca_err, Map.add(CaSi_range, CaFe_range)), 2))
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Fe_err, Map.add(FeCa_range, Fe_range)), 2))
    e_err = Map.pow(e_var, 0.5)
    use_ep = Map.under(Map.mul(Map.sub(e, ep), sign_ep), 0)
    use_e0 = Map.over(Map.mul(Map.sub(e, e0), sign_ep), 0)
    e = Map.add(Map.add(Map.mul(use_ep, ep), Map.mul(use_e0, Map.add(Map.mul(0.9, e0), Map.mul(0.1, ep)))), Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e))
    e_err = Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e_err)
    e_err = Map.add(Map.add(e_err, Map.mul(use_ep, ep_err)), Map.mul(use_e0, Map.pow(Map.add(Map.pow(Map.mul(0.9, e0_err), 2), Map.pow(Map.mul(0.1, ep_err), 2)), 0.5)))
    R = Map.div(Map.sub(1, e), Map.add(1, e))
    de = Map.div(Map.sub(e0, e), e0)
    beta = Map.add(1, Map.div(Map.mul(Map.mul(Map.mul(e0, e0), de), Map.sub(1, de)), Map.sub(1, Map.mul(Map.mul(e0, e0), Map.sub(1, de)))))

    -- diff = 1 if diffraction present, 0 if not
    e_obs = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))
    e_obs_err = Map.mul(2, Map.pow(Map.div(Map.mul(I_A, I_B), Map.pow(Map.add(I_A, I_B), 3)), 0.5))
    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))                    -- Machine learning method
    diff_r = Map.under(Map.div(Map.pow(Map.sub(e_obs, e), 2), Map.add(Map.pow(e_err, 2), Map.pow(e_obs_err, 2))), sigma_cutoff)  -- Fixed bin method
    diff = Map.add(diff_ML, Map.mul(ML, Map.sub(diff_r, Map.mul(diff_ML, diff_r))))  -- If using machine learning, returns ML || bin result
    diff_in_A = Map.mul(diff, Map.over(Map.sub(e_obs, e), 0))
    diff_in_B = Map.mul(diff, Map.under(Map.sub(e_obs, e), 0))

    -- If diffraction is detected, return the corrected abundance for the "clean" detector
    A_B = Map.div(1, X_Bq)
    A_e = Map.div(Map.add(1, e0), Map.mul(Map.add(1, e), Map.sub(1, Map.mul(e0, e))))
    A_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    B_A = Map.div(1, X_Aq)
    B_e = Map.div(Map.sub(e0, 1), Map.mul(Map.sub(1, e), Map.sub(1, Map.mul(e0, e))))
    B_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    X_Adiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Bq), beta), Map.mul(2, R))
    X_Bdiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Aq), beta), 2)
    X_err_Adiff = Map.mul(X_Adiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(A_B, X_Berr), 2), Map.pow(Map.mul(A_e, e_err), 2)), Map.pow(Map.mul(A_e0, e0_err), 2)), 0.5))
    X_err_Bdiff = Map.mul(X_Bdiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(B_A, X_Aerr), 2), Map.pow(Map.mul(B_e, e_err), 2)), Map.pow(Map.mul(B_e0, e0_err), 2)), 0.5))
    X_diff = Map.add(Map.mul(X_Bdiff, diff_in_B), Map.mul(X_Adiff, diff_in_A))
    X_err_diff = Map.add(Map.mul(X_err_Bdiff, diff_in_B), Map.mul(X_err_Adiff, diff_in_A))

    -- Else, return the corrected abundance derived from both detectors
    C_AB = Map.div(1, Map.add(X_Aq, X_Bq))
    C_e = Map.div(Map.sub(Map.mul(e0, Map.sub(1, Map.mul(e, e))), Map.mul(2, e)), Map.mul(Map.sub(1, Map.mul(e, e)), Map.sub(1, Map.mul(e0, e))))
    C_e0 = Map.div(e0, Map.sub(1, Map.mul(e0, e)))
    X_geom = Map.div(Map.mul(Map.add(X_Aq, X_Bq), beta), 2)
    X_err_geom = Map.mul(X_geom, Map.pow(Map.add(Map.add(Map.add(Map.pow(Map.mul(C_AB, X_Aerr), 2), Map.pow(Map.mul(C_AB, X_Berr), 2)), Map.pow(Map.mul(C_e, e_err), 2)), Map.pow(Map.mul(C_e0, e0_err), 2)), 0.5))

    X = Map.add(Map.mul(diff, X_diff), Map.mul(Map.sub(1, diff), X_geom))
    X_err = Map.add(Map.mul(diff, X_err_diff), Map.mul(Map.sub(1, diff), X_err_geom))
    -- ***End estimate calibrated abundance***
    MgO = X
    MgO_err = X_err
    TOTAL = Map.add(TOTAL, MgO)
    TOTAL_err = Map.pow(Map.add(Map.pow(TOTAL_err, 2), Map.pow(MgO_err, 2)), 0.5)

    -- ***Estimate calibrated abundance***
    X_start = Al_start  -- Insert start energy channel
    X_end = Al_end    -- Insert end energy channel
    _element = "Al2O3"
    mass = ((2 * nAl) + (3 * nO))
    wt = 1

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    X_Aq = Map.add(Map.mul(wt, element(_element, "%", "A")), Map.mul((1 - wt), element(_element, "%-as-mmol", "A")))
    X_Bq = Map.add(Map.mul(wt, element(_element, "%", "B")), Map.mul((1 - wt), element(_element, "%-as-mmol", "B")))
    X_Aerr = Map.mul(element(_element, "err", "A"), (wt + (((1 - wt) * 10) / mass)))
    X_Berr = Map.mul(element(_element, "err", "B"), (wt + (((1 - wt) * 10) / mass)))

    midpoint = (0.5 * (X_start + X_end))

    Si_range = Map.under(Map.mul(midpoint, unit), 226)
    SiCa_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (490 - midpoint)), (490 - 226))
    CaSi_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (midpoint - 226)), (490 - 226))
    CaFe_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (854 - midpoint)), (854 - 490))
    FeCa_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (midpoint - 490)), (854 - 490))
    Fe_range = Map.sub(1, Map.under(Map.mul(midpoint, unit), 854))
    e = Map.add(Map.add(Map.mul(e_Si, Map.add(Si_range, SiCa_range)), Map.mul(e_Ca, Map.add(CaSi_range, CaFe_range))), Map.mul(e_Fe, Map.add(FeCa_range, Fe_range)))
    e_var = Map.pow(Map.mul(e_Si_err, Map.add(Si_range, SiCa_range)), 2)
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Ca_err, Map.add(CaSi_range, CaFe_range)), 2))
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Fe_err, Map.add(FeCa_range, Fe_range)), 2))
    e_err = Map.pow(e_var, 0.5)
    use_ep = Map.under(Map.mul(Map.sub(e, ep), sign_ep), 0)
    use_e0 = Map.over(Map.mul(Map.sub(e, e0), sign_ep), 0)
    e = Map.add(Map.add(Map.mul(use_ep, ep), Map.mul(use_e0, Map.add(Map.mul(0.9, e0), Map.mul(0.1, ep)))), Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e))
    e_err = Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e_err)
    e_err = Map.add(Map.add(e_err, Map.mul(use_ep, ep_err)), Map.mul(use_e0, Map.pow(Map.add(Map.pow(Map.mul(0.9, e0_err), 2), Map.pow(Map.mul(0.1, ep_err), 2)), 0.5)))
    R = Map.div(Map.sub(1, e), Map.add(1, e))
    de = Map.div(Map.sub(e0, e), e0)
    beta = Map.add(1, Map.div(Map.mul(Map.mul(Map.mul(e0, e0), de), Map.sub(1, de)), Map.sub(1, Map.mul(Map.mul(e0, e0), Map.sub(1, de)))))

    -- diff = 1 if diffraction present, 0 if not
    e_obs = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))
    e_obs_err = Map.mul(2, Map.pow(Map.div(Map.mul(I_A, I_B), Map.pow(Map.add(I_A, I_B), 3)), 0.5))
    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))                    -- Machine learning method
    diff_r = Map.under(Map.div(Map.pow(Map.sub(e_obs, e), 2), Map.add(Map.pow(e_err, 2), Map.pow(e_obs_err, 2))), sigma_cutoff)  -- Fixed bin method
    diff = Map.add(diff_ML, Map.mul(ML, Map.sub(diff_r, Map.mul(diff_ML, diff_r))))  -- If using machine learning, returns ML || bin result
    diff_in_A = Map.mul(diff, Map.over(Map.sub(e_obs, e), 0))
    diff_in_B = Map.mul(diff, Map.under(Map.sub(e_obs, e), 0))

    -- If diffraction is detected, return the corrected abundance for the "clean" detector
    A_B = Map.div(1, X_Bq)
    A_e = Map.div(Map.add(1, e0), Map.mul(Map.add(1, e), Map.sub(1, Map.mul(e0, e))))
    A_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    B_A = Map.div(1, X_Aq)
    B_e = Map.div(Map.sub(e0, 1), Map.mul(Map.sub(1, e), Map.sub(1, Map.mul(e0, e))))
    B_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    X_Adiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Bq), beta), Map.mul(2, R))
    X_Bdiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Aq), beta), 2)
    X_err_Adiff = Map.mul(X_Adiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(A_B, X_Berr), 2), Map.pow(Map.mul(A_e, e_err), 2)), Map.pow(Map.mul(A_e0, e0_err), 2)), 0.5))
    X_err_Bdiff = Map.mul(X_Bdiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(B_A, X_Aerr), 2), Map.pow(Map.mul(B_e, e_err), 2)), Map.pow(Map.mul(B_e0, e0_err), 2)), 0.5))
    X_diff = Map.add(Map.mul(X_Bdiff, diff_in_B), Map.mul(X_Adiff, diff_in_A))
    X_err_diff = Map.add(Map.mul(X_err_Bdiff, diff_in_B), Map.mul(X_err_Adiff, diff_in_A))

    -- Else, return the corrected abundance derived from both detectors
    C_AB = Map.div(1, Map.add(X_Aq, X_Bq))
    C_e = Map.div(Map.sub(Map.mul(e0, Map.sub(1, Map.mul(e, e))), Map.mul(2, e)), Map.mul(Map.sub(1, Map.mul(e, e)), Map.sub(1, Map.mul(e0, e))))
    C_e0 = Map.div(e0, Map.sub(1, Map.mul(e0, e)))
    X_geom = Map.div(Map.mul(Map.add(X_Aq, X_Bq), beta), 2)
    X_err_geom = Map.mul(X_geom, Map.pow(Map.add(Map.add(Map.add(Map.pow(Map.mul(C_AB, X_Aerr), 2), Map.pow(Map.mul(C_AB, X_Berr), 2)), Map.pow(Map.mul(C_e, e_err), 2)), Map.pow(Map.mul(C_e0, e0_err), 2)), 0.5))

    X = Map.add(Map.mul(diff, X_diff), Map.mul(Map.sub(1, diff), X_geom))
    X_err = Map.add(Map.mul(diff, X_err_diff), Map.mul(Map.sub(1, diff), X_err_geom))
    -- ***End estimate calibrated abundance***
    Al2O3 = X
    Al2O3_err = X_err
    TOTAL = Map.add(TOTAL, Al2O3)
    TOTAL_err = Map.pow(Map.add(Map.pow(TOTAL_err, 2), Map.pow(Al2O3_err, 2)), 0.5)

    -- ***Estimate calibrated abundance***
    X_start = Si_start  -- Insert start energy channel
    X_end = Si_end    -- Insert end energy channel
    _element = "SiO2"
    mass = (nSi + (2 * nO))
    wt = 1

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    X_Aq = Map.add(Map.mul(wt, element(_element, "%", "A")), Map.mul((1 - wt), element(_element, "%-as-mmol", "A")))
    X_Bq = Map.add(Map.mul(wt, element(_element, "%", "B")), Map.mul((1 - wt), element(_element, "%-as-mmol", "B")))
    X_Aerr = Map.mul(element(_element, "err", "A"), (wt + (((1 - wt) * 10) / mass)))
    X_Berr = Map.mul(element(_element, "err", "B"), (wt + (((1 - wt) * 10) / mass)))

    midpoint = (0.5 * (X_start + X_end))

    Si_range = Map.under(Map.mul(midpoint, unit), 226)
    SiCa_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (490 - midpoint)), (490 - 226))
    CaSi_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (midpoint - 226)), (490 - 226))
    CaFe_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (854 - midpoint)), (854 - 490))
    FeCa_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (midpoint - 490)), (854 - 490))
    Fe_range = Map.sub(1, Map.under(Map.mul(midpoint, unit), 854))
    e = Map.add(Map.add(Map.mul(e_Si, Map.add(Si_range, SiCa_range)), Map.mul(e_Ca, Map.add(CaSi_range, CaFe_range))), Map.mul(e_Fe, Map.add(FeCa_range, Fe_range)))
    e_var = Map.pow(Map.mul(e_Si_err, Map.add(Si_range, SiCa_range)), 2)
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Ca_err, Map.add(CaSi_range, CaFe_range)), 2))
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Fe_err, Map.add(FeCa_range, Fe_range)), 2))
    e_err = Map.pow(e_var, 0.5)
    use_ep = Map.under(Map.mul(Map.sub(e, ep), sign_ep), 0)
    use_e0 = Map.over(Map.mul(Map.sub(e, e0), sign_ep), 0)
    e = Map.add(Map.add(Map.mul(use_ep, ep), Map.mul(use_e0, Map.add(Map.mul(0.9, e0), Map.mul(0.1, ep)))), Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e))
    e_err = Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e_err)
    e_err = Map.add(Map.add(e_err, Map.mul(use_ep, ep_err)), Map.mul(use_e0, Map.pow(Map.add(Map.pow(Map.mul(0.9, e0_err), 2), Map.pow(Map.mul(0.1, ep_err), 2)), 0.5)))
    R = Map.div(Map.sub(1, e), Map.add(1, e))
    de = Map.div(Map.sub(e0, e), e0)
    beta = Map.add(1, Map.div(Map.mul(Map.mul(Map.mul(e0, e0), de), Map.sub(1, de)), Map.sub(1, Map.mul(Map.mul(e0, e0), Map.sub(1, de)))))

    -- diff = 1 if diffraction present, 0 if not
    e_obs = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))
    e_obs_err = Map.mul(2, Map.pow(Map.div(Map.mul(I_A, I_B), Map.pow(Map.add(I_A, I_B), 3)), 0.5))
    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))                    -- Machine learning method
    diff_r = Map.under(Map.div(Map.pow(Map.sub(e_obs, e), 2), Map.add(Map.pow(e_err, 2), Map.pow(e_obs_err, 2))), sigma_cutoff)  -- Fixed bin method
    diff = Map.add(diff_ML, Map.mul(ML, Map.sub(diff_r, Map.mul(diff_ML, diff_r))))  -- If using machine learning, returns ML || bin result
    diff_in_A = Map.mul(diff, Map.over(Map.sub(e_obs, e), 0))
    diff_in_B = Map.mul(diff, Map.under(Map.sub(e_obs, e), 0))

    -- If diffraction is detected, return the corrected abundance for the "clean" detector
    A_B = Map.div(1, X_Bq)
    A_e = Map.div(Map.add(1, e0), Map.mul(Map.add(1, e), Map.sub(1, Map.mul(e0, e))))
    A_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    B_A = Map.div(1, X_Aq)
    B_e = Map.div(Map.sub(e0, 1), Map.mul(Map.sub(1, e), Map.sub(1, Map.mul(e0, e))))
    B_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    X_Adiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Bq), beta), Map.mul(2, R))
    X_Bdiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Aq), beta), 2)
    X_err_Adiff = Map.mul(X_Adiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(A_B, X_Berr), 2), Map.pow(Map.mul(A_e, e_err), 2)), Map.pow(Map.mul(A_e0, e0_err), 2)), 0.5))
    X_err_Bdiff = Map.mul(X_Bdiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(B_A, X_Aerr), 2), Map.pow(Map.mul(B_e, e_err), 2)), Map.pow(Map.mul(B_e0, e0_err), 2)), 0.5))
    X_diff = Map.add(Map.mul(X_Bdiff, diff_in_B), Map.mul(X_Adiff, diff_in_A))
    X_err_diff = Map.add(Map.mul(X_err_Bdiff, diff_in_B), Map.mul(X_err_Adiff, diff_in_A))

    -- Else, return the corrected abundance derived from both detectors
    C_AB = Map.div(1, Map.add(X_Aq, X_Bq))
    C_e = Map.div(Map.sub(Map.mul(e0, Map.sub(1, Map.mul(e, e))), Map.mul(2, e)), Map.mul(Map.sub(1, Map.mul(e, e)), Map.sub(1, Map.mul(e0, e))))
    C_e0 = Map.div(e0, Map.sub(1, Map.mul(e0, e)))
    X_geom = Map.div(Map.mul(Map.add(X_Aq, X_Bq), beta), 2)
    X_err_geom = Map.mul(X_geom, Map.pow(Map.add(Map.add(Map.add(Map.pow(Map.mul(C_AB, X_Aerr), 2), Map.pow(Map.mul(C_AB, X_Berr), 2)), Map.pow(Map.mul(C_e, e_err), 2)), Map.pow(Map.mul(C_e0, e0_err), 2)), 0.5))

    X = Map.add(Map.mul(diff, X_diff), Map.mul(Map.sub(1, diff), X_geom))
    X_err = Map.add(Map.mul(diff, X_err_diff), Map.mul(Map.sub(1, diff), X_err_geom))
    -- ***End estimate calibrated abundance***
    SiO2 = X
    SiO2_err = X_err
    TOTAL = Map.add(TOTAL, SiO2)
    TOTAL_err = Map.pow(Map.add(Map.pow(TOTAL_err, 2), Map.pow(SiO2_err, 2)), 0.5)

    -- ***Estimate calibrated abundance***
    X_start = P_start  -- Insert start energy channel
    X_end = P_end    -- Insert end energy channel
    _element = "P2O5"
    mass = ((2 * nP) + (5 * nO))
    wt = 1

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    X_Aq = Map.add(Map.mul(wt, element(_element, "%", "A")), Map.mul((1 - wt), element(_element, "%-as-mmol", "A")))
    X_Bq = Map.add(Map.mul(wt, element(_element, "%", "B")), Map.mul((1 - wt), element(_element, "%-as-mmol", "B")))
    X_Aerr = Map.mul(element(_element, "err", "A"), (wt + (((1 - wt) * 10) / mass)))
    X_Berr = Map.mul(element(_element, "err", "B"), (wt + (((1 - wt) * 10) / mass)))

    midpoint = (0.5 * (X_start + X_end))

    Si_range = Map.under(Map.mul(midpoint, unit), 226)
    SiCa_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (490 - midpoint)), (490 - 226))
    CaSi_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (midpoint - 226)), (490 - 226))
    CaFe_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (854 - midpoint)), (854 - 490))
    FeCa_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (midpoint - 490)), (854 - 490))
    Fe_range = Map.sub(1, Map.under(Map.mul(midpoint, unit), 854))
    e = Map.add(Map.add(Map.mul(e_Si, Map.add(Si_range, SiCa_range)), Map.mul(e_Ca, Map.add(CaSi_range, CaFe_range))), Map.mul(e_Fe, Map.add(FeCa_range, Fe_range)))
    e_var = Map.pow(Map.mul(e_Si_err, Map.add(Si_range, SiCa_range)), 2)
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Ca_err, Map.add(CaSi_range, CaFe_range)), 2))
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Fe_err, Map.add(FeCa_range, Fe_range)), 2))
    e_err = Map.pow(e_var, 0.5)
    use_ep = Map.under(Map.mul(Map.sub(e, ep), sign_ep), 0)
    use_e0 = Map.over(Map.mul(Map.sub(e, e0), sign_ep), 0)
    e = Map.add(Map.add(Map.mul(use_ep, ep), Map.mul(use_e0, Map.add(Map.mul(0.9, e0), Map.mul(0.1, ep)))), Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e))
    e_err = Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e_err)
    e_err = Map.add(Map.add(e_err, Map.mul(use_ep, ep_err)), Map.mul(use_e0, Map.pow(Map.add(Map.pow(Map.mul(0.9, e0_err), 2), Map.pow(Map.mul(0.1, ep_err), 2)), 0.5)))
    R = Map.div(Map.sub(1, e), Map.add(1, e))
    de = Map.div(Map.sub(e0, e), e0)
    beta = Map.add(1, Map.div(Map.mul(Map.mul(Map.mul(e0, e0), de), Map.sub(1, de)), Map.sub(1, Map.mul(Map.mul(e0, e0), Map.sub(1, de)))))

    -- diff = 1 if diffraction present, 0 if not
    e_obs = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))
    e_obs_err = Map.mul(2, Map.pow(Map.div(Map.mul(I_A, I_B), Map.pow(Map.add(I_A, I_B), 3)), 0.5))
    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))                    -- Machine learning method
    diff_r = Map.under(Map.div(Map.pow(Map.sub(e_obs, e), 2), Map.add(Map.pow(e_err, 2), Map.pow(e_obs_err, 2))), sigma_cutoff)  -- Fixed bin method
    diff = Map.add(diff_ML, Map.mul(ML, Map.sub(diff_r, Map.mul(diff_ML, diff_r))))  -- If using machine learning, returns ML || bin result
    diff_in_A = Map.mul(diff, Map.over(Map.sub(e_obs, e), 0))
    diff_in_B = Map.mul(diff, Map.under(Map.sub(e_obs, e), 0))

    -- If diffraction is detected, return the corrected abundance for the "clean" detector
    A_B = Map.div(1, X_Bq)
    A_e = Map.div(Map.add(1, e0), Map.mul(Map.add(1, e), Map.sub(1, Map.mul(e0, e))))
    A_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    B_A = Map.div(1, X_Aq)
    B_e = Map.div(Map.sub(e0, 1), Map.mul(Map.sub(1, e), Map.sub(1, Map.mul(e0, e))))
    B_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    X_Adiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Bq), beta), Map.mul(2, R))
    X_Bdiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Aq), beta), 2)
    X_err_Adiff = Map.mul(X_Adiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(A_B, X_Berr), 2), Map.pow(Map.mul(A_e, e_err), 2)), Map.pow(Map.mul(A_e0, e0_err), 2)), 0.5))
    X_err_Bdiff = Map.mul(X_Bdiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(B_A, X_Aerr), 2), Map.pow(Map.mul(B_e, e_err), 2)), Map.pow(Map.mul(B_e0, e0_err), 2)), 0.5))
    X_diff = Map.add(Map.mul(X_Bdiff, diff_in_B), Map.mul(X_Adiff, diff_in_A))
    X_err_diff = Map.add(Map.mul(X_err_Bdiff, diff_in_B), Map.mul(X_err_Adiff, diff_in_A))

    -- Else, return the corrected abundance derived from both detectors
    C_AB = Map.div(1, Map.add(X_Aq, X_Bq))
    C_e = Map.div(Map.sub(Map.mul(e0, Map.sub(1, Map.mul(e, e))), Map.mul(2, e)), Map.mul(Map.sub(1, Map.mul(e, e)), Map.sub(1, Map.mul(e0, e))))
    C_e0 = Map.div(e0, Map.sub(1, Map.mul(e0, e)))
    X_geom = Map.div(Map.mul(Map.add(X_Aq, X_Bq), beta), 2)
    X_err_geom = Map.mul(X_geom, Map.pow(Map.add(Map.add(Map.add(Map.pow(Map.mul(C_AB, X_Aerr), 2), Map.pow(Map.mul(C_AB, X_Berr), 2)), Map.pow(Map.mul(C_e, e_err), 2)), Map.pow(Map.mul(C_e0, e0_err), 2)), 0.5))

    X = Map.add(Map.mul(diff, X_diff), Map.mul(Map.sub(1, diff), X_geom))
    X_err = Map.add(Map.mul(diff, X_err_diff), Map.mul(Map.sub(1, diff), X_err_geom))
    -- ***End estimate calibrated abundance***
    P2O5 = X
    P2O5_err = X_err
    TOTAL = Map.add(TOTAL, P2O5)
    TOTAL_err = Map.pow(Map.add(Map.pow(TOTAL_err, 2), Map.pow(P2O5_err, 2)), 0.5)

    -- ***Estimate calibrated abundance***
    X_start = S_start  -- Insert start energy channel
    X_end = S_end    -- Insert end energy channel
    _element = "SO3"
    mass = (nS + (3 * nO))
    wt = 1

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    X_Aq = Map.add(Map.mul(wt, element(_element, "%", "A")), Map.mul((1 - wt), element(_element, "%-as-mmol", "A")))
    X_Bq = Map.add(Map.mul(wt, element(_element, "%", "B")), Map.mul((1 - wt), element(_element, "%-as-mmol", "B")))
    X_Aerr = Map.mul(element(_element, "err", "A"), (wt + (((1 - wt) * 10) / mass)))
    X_Berr = Map.mul(element(_element, "err", "B"), (wt + (((1 - wt) * 10) / mass)))

    midpoint = (0.5 * (X_start + X_end))

    Si_range = Map.under(Map.mul(midpoint, unit), 226)
    SiCa_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (490 - midpoint)), (490 - 226))
    CaSi_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (midpoint - 226)), (490 - 226))
    CaFe_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (854 - midpoint)), (854 - 490))
    FeCa_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (midpoint - 490)), (854 - 490))
    Fe_range = Map.sub(1, Map.under(Map.mul(midpoint, unit), 854))
    e = Map.add(Map.add(Map.mul(e_Si, Map.add(Si_range, SiCa_range)), Map.mul(e_Ca, Map.add(CaSi_range, CaFe_range))), Map.mul(e_Fe, Map.add(FeCa_range, Fe_range)))
    e_var = Map.pow(Map.mul(e_Si_err, Map.add(Si_range, SiCa_range)), 2)
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Ca_err, Map.add(CaSi_range, CaFe_range)), 2))
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Fe_err, Map.add(FeCa_range, Fe_range)), 2))
    e_err = Map.pow(e_var, 0.5)
    use_ep = Map.under(Map.mul(Map.sub(e, ep), sign_ep), 0)
    use_e0 = Map.over(Map.mul(Map.sub(e, e0), sign_ep), 0)
    e = Map.add(Map.add(Map.mul(use_ep, ep), Map.mul(use_e0, Map.add(Map.mul(0.9, e0), Map.mul(0.1, ep)))), Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e))
    e_err = Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e_err)
    e_err = Map.add(Map.add(e_err, Map.mul(use_ep, ep_err)), Map.mul(use_e0, Map.pow(Map.add(Map.pow(Map.mul(0.9, e0_err), 2), Map.pow(Map.mul(0.1, ep_err), 2)), 0.5)))
    R = Map.div(Map.sub(1, e), Map.add(1, e))
    de = Map.div(Map.sub(e0, e), e0)
    beta = Map.add(1, Map.div(Map.mul(Map.mul(Map.mul(e0, e0), de), Map.sub(1, de)), Map.sub(1, Map.mul(Map.mul(e0, e0), Map.sub(1, de)))))

    -- diff = 1 if diffraction present, 0 if not
    e_obs = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))
    e_obs_err = Map.mul(2, Map.pow(Map.div(Map.mul(I_A, I_B), Map.pow(Map.add(I_A, I_B), 3)), 0.5))
    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))                    -- Machine learning method
    diff_r = Map.under(Map.div(Map.pow(Map.sub(e_obs, e), 2), Map.add(Map.pow(e_err, 2), Map.pow(e_obs_err, 2))), sigma_cutoff)  -- Fixed bin method
    diff = Map.add(diff_ML, Map.mul(ML, Map.sub(diff_r, Map.mul(diff_ML, diff_r))))  -- If using machine learning, returns ML || bin result
    diff_in_A = Map.mul(diff, Map.over(Map.sub(e_obs, e), 0))
    diff_in_B = Map.mul(diff, Map.under(Map.sub(e_obs, e), 0))

    -- If diffraction is detected, return the corrected abundance for the "clean" detector
    A_B = Map.div(1, X_Bq)
    A_e = Map.div(Map.add(1, e0), Map.mul(Map.add(1, e), Map.sub(1, Map.mul(e0, e))))
    A_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    B_A = Map.div(1, X_Aq)
    B_e = Map.div(Map.sub(e0, 1), Map.mul(Map.sub(1, e), Map.sub(1, Map.mul(e0, e))))
    B_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    X_Adiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Bq), beta), Map.mul(2, R))
    X_Bdiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Aq), beta), 2)
    X_err_Adiff = Map.mul(X_Adiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(A_B, X_Berr), 2), Map.pow(Map.mul(A_e, e_err), 2)), Map.pow(Map.mul(A_e0, e0_err), 2)), 0.5))
    X_err_Bdiff = Map.mul(X_Bdiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(B_A, X_Aerr), 2), Map.pow(Map.mul(B_e, e_err), 2)), Map.pow(Map.mul(B_e0, e0_err), 2)), 0.5))
    X_diff = Map.add(Map.mul(X_Bdiff, diff_in_B), Map.mul(X_Adiff, diff_in_A))
    X_err_diff = Map.add(Map.mul(X_err_Bdiff, diff_in_B), Map.mul(X_err_Adiff, diff_in_A))

    -- Else, return the corrected abundance derived from both detectors
    C_AB = Map.div(1, Map.add(X_Aq, X_Bq))
    C_e = Map.div(Map.sub(Map.mul(e0, Map.sub(1, Map.mul(e, e))), Map.mul(2, e)), Map.mul(Map.sub(1, Map.mul(e, e)), Map.sub(1, Map.mul(e0, e))))
    C_e0 = Map.div(e0, Map.sub(1, Map.mul(e0, e)))
    X_geom = Map.div(Map.mul(Map.add(X_Aq, X_Bq), beta), 2)
    X_err_geom = Map.mul(X_geom, Map.pow(Map.add(Map.add(Map.add(Map.pow(Map.mul(C_AB, X_Aerr), 2), Map.pow(Map.mul(C_AB, X_Berr), 2)), Map.pow(Map.mul(C_e, e_err), 2)), Map.pow(Map.mul(C_e0, e0_err), 2)), 0.5))

    X = Map.add(Map.mul(diff, X_diff), Map.mul(Map.sub(1, diff), X_geom))
    X_err = Map.add(Map.mul(diff, X_err_diff), Map.mul(Map.sub(1, diff), X_err_geom))
    -- ***End estimate calibrated abundance***
    SO3 = X
    SO3_err = X_err
    TOTAL = Map.add(TOTAL, SO3)
    TOTAL_err = Map.pow(Map.add(Map.pow(TOTAL_err, 2), Map.pow(SO3_err, 2)), 0.5)

    -- ***Estimate calibrated abundance***
    X_start = Cl_start  -- Insert start energy channel
    X_end = Cl_end    -- Insert end energy channel
    _element = "Cl"
    mass = nCl
    wt = 1

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    X_Aq = Map.add(Map.mul(wt, element(_element, "%", "A")), Map.mul((1 - wt), element(_element, "%-as-mmol", "A")))
    X_Bq = Map.add(Map.mul(wt, element(_element, "%", "B")), Map.mul((1 - wt), element(_element, "%-as-mmol", "B")))
    X_Aerr = Map.mul(element(_element, "err", "A"), (wt + (((1 - wt) * 10) / mass)))
    X_Berr = Map.mul(element(_element, "err", "B"), (wt + (((1 - wt) * 10) / mass)))

    midpoint = (0.5 * (X_start + X_end))

    Si_range = Map.under(Map.mul(midpoint, unit), 226)
    SiCa_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (490 - midpoint)), (490 - 226))
    CaSi_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (midpoint - 226)), (490 - 226))
    CaFe_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (854 - midpoint)), (854 - 490))
    FeCa_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (midpoint - 490)), (854 - 490))
    Fe_range = Map.sub(1, Map.under(Map.mul(midpoint, unit), 854))
    e = Map.add(Map.add(Map.mul(e_Si, Map.add(Si_range, SiCa_range)), Map.mul(e_Ca, Map.add(CaSi_range, CaFe_range))), Map.mul(e_Fe, Map.add(FeCa_range, Fe_range)))
    e_var = Map.pow(Map.mul(e_Si_err, Map.add(Si_range, SiCa_range)), 2)
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Ca_err, Map.add(CaSi_range, CaFe_range)), 2))
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Fe_err, Map.add(FeCa_range, Fe_range)), 2))
    e_err = Map.pow(e_var, 0.5)
    use_ep = Map.under(Map.mul(Map.sub(e, ep), sign_ep), 0)
    use_e0 = Map.over(Map.mul(Map.sub(e, e0), sign_ep), 0)
    e = Map.add(Map.add(Map.mul(use_ep, ep), Map.mul(use_e0, Map.add(Map.mul(0.9, e0), Map.mul(0.1, ep)))), Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e))
    e_err = Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e_err)
    e_err = Map.add(Map.add(e_err, Map.mul(use_ep, ep_err)), Map.mul(use_e0, Map.pow(Map.add(Map.pow(Map.mul(0.9, e0_err), 2), Map.pow(Map.mul(0.1, ep_err), 2)), 0.5)))
    R = Map.div(Map.sub(1, e), Map.add(1, e))
    de = Map.div(Map.sub(e0, e), e0)
    beta = Map.add(1, Map.div(Map.mul(Map.mul(Map.mul(e0, e0), de), Map.sub(1, de)), Map.sub(1, Map.mul(Map.mul(e0, e0), Map.sub(1, de)))))

    -- diff = 1 if diffraction present, 0 if not
    e_obs = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))
    e_obs_err = Map.mul(2, Map.pow(Map.div(Map.mul(I_A, I_B), Map.pow(Map.add(I_A, I_B), 3)), 0.5))
    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))                    -- Machine learning method
    diff_r = Map.under(Map.div(Map.pow(Map.sub(e_obs, e), 2), Map.add(Map.pow(e_err, 2), Map.pow(e_obs_err, 2))), sigma_cutoff)  -- Fixed bin method
    diff = Map.add(diff_ML, Map.mul(ML, Map.sub(diff_r, Map.mul(diff_ML, diff_r))))  -- If using machine learning, returns ML || bin result
    diff_in_A = Map.mul(diff, Map.over(Map.sub(e_obs, e), 0))
    diff_in_B = Map.mul(diff, Map.under(Map.sub(e_obs, e), 0))

    -- If diffraction is detected, return the corrected abundance for the "clean" detector
    A_B = Map.div(1, X_Bq)
    A_e = Map.div(Map.add(1, e0), Map.mul(Map.add(1, e), Map.sub(1, Map.mul(e0, e))))
    A_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    B_A = Map.div(1, X_Aq)
    B_e = Map.div(Map.sub(e0, 1), Map.mul(Map.sub(1, e), Map.sub(1, Map.mul(e0, e))))
    B_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    X_Adiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Bq), beta), Map.mul(2, R))
    X_Bdiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Aq), beta), 2)
    X_err_Adiff = Map.mul(X_Adiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(A_B, X_Berr), 2), Map.pow(Map.mul(A_e, e_err), 2)), Map.pow(Map.mul(A_e0, e0_err), 2)), 0.5))
    X_err_Bdiff = Map.mul(X_Bdiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(B_A, X_Aerr), 2), Map.pow(Map.mul(B_e, e_err), 2)), Map.pow(Map.mul(B_e0, e0_err), 2)), 0.5))
    X_diff = Map.add(Map.mul(X_Bdiff, diff_in_B), Map.mul(X_Adiff, diff_in_A))
    X_err_diff = Map.add(Map.mul(X_err_Bdiff, diff_in_B), Map.mul(X_err_Adiff, diff_in_A))

    -- Else, return the corrected abundance derived from both detectors
    C_AB = Map.div(1, Map.add(X_Aq, X_Bq))
    C_e = Map.div(Map.sub(Map.mul(e0, Map.sub(1, Map.mul(e, e))), Map.mul(2, e)), Map.mul(Map.sub(1, Map.mul(e, e)), Map.sub(1, Map.mul(e0, e))))
    C_e0 = Map.div(e0, Map.sub(1, Map.mul(e0, e)))
    X_geom = Map.div(Map.mul(Map.add(X_Aq, X_Bq), beta), 2)
    X_err_geom = Map.mul(X_geom, Map.pow(Map.add(Map.add(Map.add(Map.pow(Map.mul(C_AB, X_Aerr), 2), Map.pow(Map.mul(C_AB, X_Berr), 2)), Map.pow(Map.mul(C_e, e_err), 2)), Map.pow(Map.mul(C_e0, e0_err), 2)), 0.5))

    X = Map.add(Map.mul(diff, X_diff), Map.mul(Map.sub(1, diff), X_geom))
    X_err = Map.add(Map.mul(diff, X_err_diff), Map.mul(Map.sub(1, diff), X_err_geom))
    -- ***End estimate calibrated abundance***
    Cl = X
    Cl_err = X_err
    TOTAL = Map.add(TOTAL, Cl)
    TOTAL_err = Map.pow(Map.add(Map.pow(TOTAL_err, 2), Map.pow(Cl_err, 2)), 0.5)

    -- ***Estimate calibrated abundance***
    X_start = K_start  -- Insert start energy channel
    X_end = K_end    -- Insert end energy channel
    _element = "K2O"
    mass = ((2 * nK) + nO)
    wt = 1

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    X_Aq = Map.add(Map.mul(wt, element(_element, "%", "A")), Map.mul((1 - wt), element(_element, "%-as-mmol", "A")))
    X_Bq = Map.add(Map.mul(wt, element(_element, "%", "B")), Map.mul((1 - wt), element(_element, "%-as-mmol", "B")))
    X_Aerr = Map.mul(element(_element, "err", "A"), (wt + (((1 - wt) * 10) / mass)))
    X_Berr = Map.mul(element(_element, "err", "B"), (wt + (((1 - wt) * 10) / mass)))

    midpoint = (0.5 * (X_start + X_end))

    Si_range = Map.under(Map.mul(midpoint, unit), 226)
    SiCa_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (490 - midpoint)), (490 - 226))
    CaSi_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (midpoint - 226)), (490 - 226))
    CaFe_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (854 - midpoint)), (854 - 490))
    FeCa_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (midpoint - 490)), (854 - 490))
    Fe_range = Map.sub(1, Map.under(Map.mul(midpoint, unit), 854))
    e = Map.add(Map.add(Map.mul(e_Si, Map.add(Si_range, SiCa_range)), Map.mul(e_Ca, Map.add(CaSi_range, CaFe_range))), Map.mul(e_Fe, Map.add(FeCa_range, Fe_range)))
    e_var = Map.pow(Map.mul(e_Si_err, Map.add(Si_range, SiCa_range)), 2)
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Ca_err, Map.add(CaSi_range, CaFe_range)), 2))
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Fe_err, Map.add(FeCa_range, Fe_range)), 2))
    e_err = Map.pow(e_var, 0.5)
    use_ep = Map.under(Map.mul(Map.sub(e, ep), sign_ep), 0)
    use_e0 = Map.over(Map.mul(Map.sub(e, e0), sign_ep), 0)
    e = Map.add(Map.add(Map.mul(use_ep, ep), Map.mul(use_e0, Map.add(Map.mul(0.9, e0), Map.mul(0.1, ep)))), Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e))
    e_err = Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e_err)
    e_err = Map.add(Map.add(e_err, Map.mul(use_ep, ep_err)), Map.mul(use_e0, Map.pow(Map.add(Map.pow(Map.mul(0.9, e0_err), 2), Map.pow(Map.mul(0.1, ep_err), 2)), 0.5)))
    R = Map.div(Map.sub(1, e), Map.add(1, e))
    de = Map.div(Map.sub(e0, e), e0)
    beta = Map.add(1, Map.div(Map.mul(Map.mul(Map.mul(e0, e0), de), Map.sub(1, de)), Map.sub(1, Map.mul(Map.mul(e0, e0), Map.sub(1, de)))))

    -- diff = 1 if diffraction present, 0 if not
    e_obs = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))
    e_obs_err = Map.mul(2, Map.pow(Map.div(Map.mul(I_A, I_B), Map.pow(Map.add(I_A, I_B), 3)), 0.5))
    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))                    -- Machine learning method
    diff_r = Map.under(Map.div(Map.pow(Map.sub(e_obs, e), 2), Map.add(Map.pow(e_err, 2), Map.pow(e_obs_err, 2))), sigma_cutoff)  -- Fixed bin method
    diff = Map.add(diff_ML, Map.mul(ML, Map.sub(diff_r, Map.mul(diff_ML, diff_r))))  -- If using machine learning, returns ML || bin result
    diff_in_A = Map.mul(diff, Map.over(Map.sub(e_obs, e), 0))
    diff_in_B = Map.mul(diff, Map.under(Map.sub(e_obs, e), 0))

    -- If diffraction is detected, return the corrected abundance for the "clean" detector
    A_B = Map.div(1, X_Bq)
    A_e = Map.div(Map.add(1, e0), Map.mul(Map.add(1, e), Map.sub(1, Map.mul(e0, e))))
    A_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    B_A = Map.div(1, X_Aq)
    B_e = Map.div(Map.sub(e0, 1), Map.mul(Map.sub(1, e), Map.sub(1, Map.mul(e0, e))))
    B_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    X_Adiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Bq), beta), Map.mul(2, R))
    X_Bdiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Aq), beta), 2)
    X_err_Adiff = Map.mul(X_Adiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(A_B, X_Berr), 2), Map.pow(Map.mul(A_e, e_err), 2)), Map.pow(Map.mul(A_e0, e0_err), 2)), 0.5))
    X_err_Bdiff = Map.mul(X_Bdiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(B_A, X_Aerr), 2), Map.pow(Map.mul(B_e, e_err), 2)), Map.pow(Map.mul(B_e0, e0_err), 2)), 0.5))
    X_diff = Map.add(Map.mul(X_Bdiff, diff_in_B), Map.mul(X_Adiff, diff_in_A))
    X_err_diff = Map.add(Map.mul(X_err_Bdiff, diff_in_B), Map.mul(X_err_Adiff, diff_in_A))

    -- Else, return the corrected abundance derived from both detectors
    C_AB = Map.div(1, Map.add(X_Aq, X_Bq))
    C_e = Map.div(Map.sub(Map.mul(e0, Map.sub(1, Map.mul(e, e))), Map.mul(2, e)), Map.mul(Map.sub(1, Map.mul(e, e)), Map.sub(1, Map.mul(e0, e))))
    C_e0 = Map.div(e0, Map.sub(1, Map.mul(e0, e)))
    X_geom = Map.div(Map.mul(Map.add(X_Aq, X_Bq), beta), 2)
    X_err_geom = Map.mul(X_geom, Map.pow(Map.add(Map.add(Map.add(Map.pow(Map.mul(C_AB, X_Aerr), 2), Map.pow(Map.mul(C_AB, X_Berr), 2)), Map.pow(Map.mul(C_e, e_err), 2)), Map.pow(Map.mul(C_e0, e0_err), 2)), 0.5))

    X = Map.add(Map.mul(diff, X_diff), Map.mul(Map.sub(1, diff), X_geom))
    X_err = Map.add(Map.mul(diff, X_err_diff), Map.mul(Map.sub(1, diff), X_err_geom))
    -- ***End estimate calibrated abundance***
    K2O = X
    K2O_err = X_err
    TOTAL = Map.add(TOTAL, K2O)
    TOTAL_err = Map.pow(Map.add(Map.pow(TOTAL_err, 2), Map.pow(K2O_err, 2)), 0.5)

    -- ***Estimate calibrated abundance***
    X_start = Ca_start  -- Insert start energy channel
    X_end = Ca_end    -- Insert end energy channel
    _element = "CaO"
    mass = (nCa + nO)
    wt = 1

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    X_Aq = Map.add(Map.mul(wt, element(_element, "%", "A")), Map.mul((1 - wt), element(_element, "%-as-mmol", "A")))
    X_Bq = Map.add(Map.mul(wt, element(_element, "%", "B")), Map.mul((1 - wt), element(_element, "%-as-mmol", "B")))
    X_Aerr = Map.mul(element(_element, "err", "A"), (wt + (((1 - wt) * 10) / mass)))
    X_Berr = Map.mul(element(_element, "err", "B"), (wt + (((1 - wt) * 10) / mass)))

    midpoint = (0.5 * (X_start + X_end))

    Si_range = Map.under(Map.mul(midpoint, unit), 226)
    SiCa_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (490 - midpoint)), (490 - 226))
    CaSi_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (midpoint - 226)), (490 - 226))
    CaFe_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (854 - midpoint)), (854 - 490))
    FeCa_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (midpoint - 490)), (854 - 490))
    Fe_range = Map.sub(1, Map.under(Map.mul(midpoint, unit), 854))
    e = Map.add(Map.add(Map.mul(e_Si, Map.add(Si_range, SiCa_range)), Map.mul(e_Ca, Map.add(CaSi_range, CaFe_range))), Map.mul(e_Fe, Map.add(FeCa_range, Fe_range)))
    e_var = Map.pow(Map.mul(e_Si_err, Map.add(Si_range, SiCa_range)), 2)
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Ca_err, Map.add(CaSi_range, CaFe_range)), 2))
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Fe_err, Map.add(FeCa_range, Fe_range)), 2))
    e_err = Map.pow(e_var, 0.5)
    use_ep = Map.under(Map.mul(Map.sub(e, ep), sign_ep), 0)
    use_e0 = Map.over(Map.mul(Map.sub(e, e0), sign_ep), 0)
    e = Map.add(Map.add(Map.mul(use_ep, ep), Map.mul(use_e0, Map.add(Map.mul(0.9, e0), Map.mul(0.1, ep)))), Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e))
    e_err = Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e_err)
    e_err = Map.add(Map.add(e_err, Map.mul(use_ep, ep_err)), Map.mul(use_e0, Map.pow(Map.add(Map.pow(Map.mul(0.9, e0_err), 2), Map.pow(Map.mul(0.1, ep_err), 2)), 0.5)))
    R = Map.div(Map.sub(1, e), Map.add(1, e))
    de = Map.div(Map.sub(e0, e), e0)
    beta = Map.add(1, Map.div(Map.mul(Map.mul(Map.mul(e0, e0), de), Map.sub(1, de)), Map.sub(1, Map.mul(Map.mul(e0, e0), Map.sub(1, de)))))

    -- diff = 1 if diffraction present, 0 if not
    e_obs = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))
    e_obs_err = Map.mul(2, Map.pow(Map.div(Map.mul(I_A, I_B), Map.pow(Map.add(I_A, I_B), 3)), 0.5))
    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))                    -- Machine learning method
    diff_r = Map.under(Map.div(Map.pow(Map.sub(e_obs, e), 2), Map.add(Map.pow(e_err, 2), Map.pow(e_obs_err, 2))), sigma_cutoff)  -- Fixed bin method
    diff = Map.add(diff_ML, Map.mul(ML, Map.sub(diff_r, Map.mul(diff_ML, diff_r))))  -- If using machine learning, returns ML || bin result
    diff_in_A = Map.mul(diff, Map.over(Map.sub(e_obs, e), 0))
    diff_in_B = Map.mul(diff, Map.under(Map.sub(e_obs, e), 0))

    -- If diffraction is detected, return the corrected abundance for the "clean" detector
    A_B = Map.div(1, X_Bq)
    A_e = Map.div(Map.add(1, e0), Map.mul(Map.add(1, e), Map.sub(1, Map.mul(e0, e))))
    A_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    B_A = Map.div(1, X_Aq)
    B_e = Map.div(Map.sub(e0, 1), Map.mul(Map.sub(1, e), Map.sub(1, Map.mul(e0, e))))
    B_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    X_Adiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Bq), beta), Map.mul(2, R))
    X_Bdiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Aq), beta), 2)
    X_err_Adiff = Map.mul(X_Adiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(A_B, X_Berr), 2), Map.pow(Map.mul(A_e, e_err), 2)), Map.pow(Map.mul(A_e0, e0_err), 2)), 0.5))
    X_err_Bdiff = Map.mul(X_Bdiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(B_A, X_Aerr), 2), Map.pow(Map.mul(B_e, e_err), 2)), Map.pow(Map.mul(B_e0, e0_err), 2)), 0.5))
    X_diff = Map.add(Map.mul(X_Bdiff, diff_in_B), Map.mul(X_Adiff, diff_in_A))
    X_err_diff = Map.add(Map.mul(X_err_Bdiff, diff_in_B), Map.mul(X_err_Adiff, diff_in_A))

    -- Else, return the corrected abundance derived from both detectors
    C_AB = Map.div(1, Map.add(X_Aq, X_Bq))
    C_e = Map.div(Map.sub(Map.mul(e0, Map.sub(1, Map.mul(e, e))), Map.mul(2, e)), Map.mul(Map.sub(1, Map.mul(e, e)), Map.sub(1, Map.mul(e0, e))))
    C_e0 = Map.div(e0, Map.sub(1, Map.mul(e0, e)))
    X_geom = Map.div(Map.mul(Map.add(X_Aq, X_Bq), beta), 2)
    X_err_geom = Map.mul(X_geom, Map.pow(Map.add(Map.add(Map.add(Map.pow(Map.mul(C_AB, X_Aerr), 2), Map.pow(Map.mul(C_AB, X_Berr), 2)), Map.pow(Map.mul(C_e, e_err), 2)), Map.pow(Map.mul(C_e0, e0_err), 2)), 0.5))

    X = Map.add(Map.mul(diff, X_diff), Map.mul(Map.sub(1, diff), X_geom))
    X_err = Map.add(Map.mul(diff, X_err_diff), Map.mul(Map.sub(1, diff), X_err_geom))
    -- ***End estimate calibrated abundance***
    CaO = X
    CaO_err = X_err
    TOTAL = Map.add(TOTAL, CaO)
    TOTAL_err = Map.pow(Map.add(Map.pow(TOTAL_err, 2), Map.pow(CaO_err, 2)), 0.5)

    -- ***Estimate calibrated abundance***
    X_start = Ti_start  -- Insert start energy channel
    X_end = Ti_end    -- Insert end energy channel
    _element = "TiO2"
    mass = (nTi + (2 * nO))
    wt = 1

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    X_Aq = Map.add(Map.mul(wt, element(_element, "%", "A")), Map.mul((1 - wt), element(_element, "%-as-mmol", "A")))
    X_Bq = Map.add(Map.mul(wt, element(_element, "%", "B")), Map.mul((1 - wt), element(_element, "%-as-mmol", "B")))
    X_Aerr = Map.mul(element(_element, "err", "A"), (wt + (((1 - wt) * 10) / mass)))
    X_Berr = Map.mul(element(_element, "err", "B"), (wt + (((1 - wt) * 10) / mass)))

    midpoint = (0.5 * (X_start + X_end))

    Si_range = Map.under(Map.mul(midpoint, unit), 226)
    SiCa_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (490 - midpoint)), (490 - 226))
    CaSi_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (midpoint - 226)), (490 - 226))
    CaFe_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (854 - midpoint)), (854 - 490))
    FeCa_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (midpoint - 490)), (854 - 490))
    Fe_range = Map.sub(1, Map.under(Map.mul(midpoint, unit), 854))
    e = Map.add(Map.add(Map.mul(e_Si, Map.add(Si_range, SiCa_range)), Map.mul(e_Ca, Map.add(CaSi_range, CaFe_range))), Map.mul(e_Fe, Map.add(FeCa_range, Fe_range)))
    e_var = Map.pow(Map.mul(e_Si_err, Map.add(Si_range, SiCa_range)), 2)
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Ca_err, Map.add(CaSi_range, CaFe_range)), 2))
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Fe_err, Map.add(FeCa_range, Fe_range)), 2))
    e_err = Map.pow(e_var, 0.5)
    use_ep = Map.under(Map.mul(Map.sub(e, ep), sign_ep), 0)
    use_e0 = Map.over(Map.mul(Map.sub(e, e0), sign_ep), 0)
    e = Map.add(Map.add(Map.mul(use_ep, ep), Map.mul(use_e0, Map.add(Map.mul(0.9, e0), Map.mul(0.1, ep)))), Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e))
    e_err = Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e_err)
    e_err = Map.add(Map.add(e_err, Map.mul(use_ep, ep_err)), Map.mul(use_e0, Map.pow(Map.add(Map.pow(Map.mul(0.9, e0_err), 2), Map.pow(Map.mul(0.1, ep_err), 2)), 0.5)))
    R = Map.div(Map.sub(1, e), Map.add(1, e))
    de = Map.div(Map.sub(e0, e), e0)
    beta = Map.add(1, Map.div(Map.mul(Map.mul(Map.mul(e0, e0), de), Map.sub(1, de)), Map.sub(1, Map.mul(Map.mul(e0, e0), Map.sub(1, de)))))

    -- diff = 1 if diffraction present, 0 if not
    e_obs = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))
    e_obs_err = Map.mul(2, Map.pow(Map.div(Map.mul(I_A, I_B), Map.pow(Map.add(I_A, I_B), 3)), 0.5))
    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))                    -- Machine learning method
    diff_r = Map.under(Map.div(Map.pow(Map.sub(e_obs, e), 2), Map.add(Map.pow(e_err, 2), Map.pow(e_obs_err, 2))), sigma_cutoff)  -- Fixed bin method
    diff = Map.add(diff_ML, Map.mul(ML, Map.sub(diff_r, Map.mul(diff_ML, diff_r))))  -- If using machine learning, returns ML || bin result
    diff_in_A = Map.mul(diff, Map.over(Map.sub(e_obs, e), 0))
    diff_in_B = Map.mul(diff, Map.under(Map.sub(e_obs, e), 0))

    -- If diffraction is detected, return the corrected abundance for the "clean" detector
    A_B = Map.div(1, X_Bq)
    A_e = Map.div(Map.add(1, e0), Map.mul(Map.add(1, e), Map.sub(1, Map.mul(e0, e))))
    A_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    B_A = Map.div(1, X_Aq)
    B_e = Map.div(Map.sub(e0, 1), Map.mul(Map.sub(1, e), Map.sub(1, Map.mul(e0, e))))
    B_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    X_Adiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Bq), beta), Map.mul(2, R))
    X_Bdiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Aq), beta), 2)
    X_err_Adiff = Map.mul(X_Adiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(A_B, X_Berr), 2), Map.pow(Map.mul(A_e, e_err), 2)), Map.pow(Map.mul(A_e0, e0_err), 2)), 0.5))
    X_err_Bdiff = Map.mul(X_Bdiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(B_A, X_Aerr), 2), Map.pow(Map.mul(B_e, e_err), 2)), Map.pow(Map.mul(B_e0, e0_err), 2)), 0.5))
    X_diff = Map.add(Map.mul(X_Bdiff, diff_in_B), Map.mul(X_Adiff, diff_in_A))
    X_err_diff = Map.add(Map.mul(X_err_Bdiff, diff_in_B), Map.mul(X_err_Adiff, diff_in_A))

    -- Else, return the corrected abundance derived from both detectors
    C_AB = Map.div(1, Map.add(X_Aq, X_Bq))
    C_e = Map.div(Map.sub(Map.mul(e0, Map.sub(1, Map.mul(e, e))), Map.mul(2, e)), Map.mul(Map.sub(1, Map.mul(e, e)), Map.sub(1, Map.mul(e0, e))))
    C_e0 = Map.div(e0, Map.sub(1, Map.mul(e0, e)))
    X_geom = Map.div(Map.mul(Map.add(X_Aq, X_Bq), beta), 2)
    X_err_geom = Map.mul(X_geom, Map.pow(Map.add(Map.add(Map.add(Map.pow(Map.mul(C_AB, X_Aerr), 2), Map.pow(Map.mul(C_AB, X_Berr), 2)), Map.pow(Map.mul(C_e, e_err), 2)), Map.pow(Map.mul(C_e0, e0_err), 2)), 0.5))

    X = Map.add(Map.mul(diff, X_diff), Map.mul(Map.sub(1, diff), X_geom))
    X_err = Map.add(Map.mul(diff, X_err_diff), Map.mul(Map.sub(1, diff), X_err_geom))
    -- ***End estimate calibrated abundance***
    TiO2 = X
    TiO2_err = X_err
    TOTAL = Map.add(TOTAL, TiO2)
    TOTAL_err = Map.pow(Map.add(Map.pow(TOTAL_err, 2), Map.pow(TiO2_err, 2)), 0.5)

    -- ***Estimate calibrated abundance***
    X_start = Cr_start  -- Insert start energy channel
    X_end = Cr_end    -- Insert end energy channel
    _element = "Cr2O3"
    mass = ((2 * nCr) + (3 * nO))
    wt = 1

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    X_Aq = Map.add(Map.mul(wt, element(_element, "%", "A")), Map.mul((1 - wt), element(_element, "%-as-mmol", "A")))
    X_Bq = Map.add(Map.mul(wt, element(_element, "%", "B")), Map.mul((1 - wt), element(_element, "%-as-mmol", "B")))
    X_Aerr = Map.mul(element(_element, "err", "A"), (wt + (((1 - wt) * 10) / mass)))
    X_Berr = Map.mul(element(_element, "err", "B"), (wt + (((1 - wt) * 10) / mass)))

    midpoint = (0.5 * (X_start + X_end))

    Si_range = Map.under(Map.mul(midpoint, unit), 226)
    SiCa_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (490 - midpoint)), (490 - 226))
    CaSi_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (midpoint - 226)), (490 - 226))
    CaFe_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (854 - midpoint)), (854 - 490))
    FeCa_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (midpoint - 490)), (854 - 490))
    Fe_range = Map.sub(1, Map.under(Map.mul(midpoint, unit), 854))
    e = Map.add(Map.add(Map.mul(e_Si, Map.add(Si_range, SiCa_range)), Map.mul(e_Ca, Map.add(CaSi_range, CaFe_range))), Map.mul(e_Fe, Map.add(FeCa_range, Fe_range)))
    e_var = Map.pow(Map.mul(e_Si_err, Map.add(Si_range, SiCa_range)), 2)
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Ca_err, Map.add(CaSi_range, CaFe_range)), 2))
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Fe_err, Map.add(FeCa_range, Fe_range)), 2))
    e_err = Map.pow(e_var, 0.5)
    use_ep = Map.under(Map.mul(Map.sub(e, ep), sign_ep), 0)
    use_e0 = Map.over(Map.mul(Map.sub(e, e0), sign_ep), 0)
    e = Map.add(Map.add(Map.mul(use_ep, ep), Map.mul(use_e0, Map.add(Map.mul(0.9, e0), Map.mul(0.1, ep)))), Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e))
    e_err = Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e_err)
    e_err = Map.add(Map.add(e_err, Map.mul(use_ep, ep_err)), Map.mul(use_e0, Map.pow(Map.add(Map.pow(Map.mul(0.9, e0_err), 2), Map.pow(Map.mul(0.1, ep_err), 2)), 0.5)))
    R = Map.div(Map.sub(1, e), Map.add(1, e))
    de = Map.div(Map.sub(e0, e), e0)
    beta = Map.add(1, Map.div(Map.mul(Map.mul(Map.mul(e0, e0), de), Map.sub(1, de)), Map.sub(1, Map.mul(Map.mul(e0, e0), Map.sub(1, de)))))

    -- diff = 1 if diffraction present, 0 if not
    e_obs = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))
    e_obs_err = Map.mul(2, Map.pow(Map.div(Map.mul(I_A, I_B), Map.pow(Map.add(I_A, I_B), 3)), 0.5))
    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))                    -- Machine learning method
    diff_r = Map.under(Map.div(Map.pow(Map.sub(e_obs, e), 2), Map.add(Map.pow(e_err, 2), Map.pow(e_obs_err, 2))), sigma_cutoff)  -- Fixed bin method
    diff = Map.add(diff_ML, Map.mul(ML, Map.sub(diff_r, Map.mul(diff_ML, diff_r))))  -- If using machine learning, returns ML || bin result
    diff_in_A = Map.mul(diff, Map.over(Map.sub(e_obs, e), 0))
    diff_in_B = Map.mul(diff, Map.under(Map.sub(e_obs, e), 0))

    -- If diffraction is detected, return the corrected abundance for the "clean" detector
    A_B = Map.div(1, X_Bq)
    A_e = Map.div(Map.add(1, e0), Map.mul(Map.add(1, e), Map.sub(1, Map.mul(e0, e))))
    A_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    B_A = Map.div(1, X_Aq)
    B_e = Map.div(Map.sub(e0, 1), Map.mul(Map.sub(1, e), Map.sub(1, Map.mul(e0, e))))
    B_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    X_Adiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Bq), beta), Map.mul(2, R))
    X_Bdiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Aq), beta), 2)
    X_err_Adiff = Map.mul(X_Adiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(A_B, X_Berr), 2), Map.pow(Map.mul(A_e, e_err), 2)), Map.pow(Map.mul(A_e0, e0_err), 2)), 0.5))
    X_err_Bdiff = Map.mul(X_Bdiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(B_A, X_Aerr), 2), Map.pow(Map.mul(B_e, e_err), 2)), Map.pow(Map.mul(B_e0, e0_err), 2)), 0.5))
    X_diff = Map.add(Map.mul(X_Bdiff, diff_in_B), Map.mul(X_Adiff, diff_in_A))
    X_err_diff = Map.add(Map.mul(X_err_Bdiff, diff_in_B), Map.mul(X_err_Adiff, diff_in_A))

    -- Else, return the corrected abundance derived from both detectors
    C_AB = Map.div(1, Map.add(X_Aq, X_Bq))
    C_e = Map.div(Map.sub(Map.mul(e0, Map.sub(1, Map.mul(e, e))), Map.mul(2, e)), Map.mul(Map.sub(1, Map.mul(e, e)), Map.sub(1, Map.mul(e0, e))))
    C_e0 = Map.div(e0, Map.sub(1, Map.mul(e0, e)))
    X_geom = Map.div(Map.mul(Map.add(X_Aq, X_Bq), beta), 2)
    X_err_geom = Map.mul(X_geom, Map.pow(Map.add(Map.add(Map.add(Map.pow(Map.mul(C_AB, X_Aerr), 2), Map.pow(Map.mul(C_AB, X_Berr), 2)), Map.pow(Map.mul(C_e, e_err), 2)), Map.pow(Map.mul(C_e0, e0_err), 2)), 0.5))

    X = Map.add(Map.mul(diff, X_diff), Map.mul(Map.sub(1, diff), X_geom))
    X_err = Map.add(Map.mul(diff, X_err_diff), Map.mul(Map.sub(1, diff), X_err_geom))
    -- ***End estimate calibrated abundance***
    Cr2O3 = X
    Cr2O3_err = X_err
    TOTAL = Map.add(TOTAL, Cr2O3)
    TOTAL_err = Map.pow(Map.add(Map.pow(TOTAL_err, 2), Map.pow(Cr2O3_err, 2)), 0.5)

    -- ***Estimate calibrated abundance***
    X_start = Mn_start  -- Insert start energy channel
    X_end = Mn_end    -- Insert end energy channel
    _element = "MnO"
    mass = (nMn + nO)
    wt = 1

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    X_Aq = Map.add(Map.mul(wt, element(_element, "%", "A")), Map.mul((1 - wt), element(_element, "%-as-mmol", "A")))
    X_Bq = Map.add(Map.mul(wt, element(_element, "%", "B")), Map.mul((1 - wt), element(_element, "%-as-mmol", "B")))
    X_Aerr = Map.mul(element(_element, "err", "A"), (wt + (((1 - wt) * 10) / mass)))
    X_Berr = Map.mul(element(_element, "err", "B"), (wt + (((1 - wt) * 10) / mass)))

    midpoint = (0.5 * (X_start + X_end))

    Si_range = Map.under(Map.mul(midpoint, unit), 226)
    SiCa_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (490 - midpoint)), (490 - 226))
    CaSi_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (midpoint - 226)), (490 - 226))
    CaFe_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (854 - midpoint)), (854 - 490))
    FeCa_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (midpoint - 490)), (854 - 490))
    Fe_range = Map.sub(1, Map.under(Map.mul(midpoint, unit), 854))
    e = Map.add(Map.add(Map.mul(e_Si, Map.add(Si_range, SiCa_range)), Map.mul(e_Ca, Map.add(CaSi_range, CaFe_range))), Map.mul(e_Fe, Map.add(FeCa_range, Fe_range)))
    e_var = Map.pow(Map.mul(e_Si_err, Map.add(Si_range, SiCa_range)), 2)
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Ca_err, Map.add(CaSi_range, CaFe_range)), 2))
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Fe_err, Map.add(FeCa_range, Fe_range)), 2))
    e_err = Map.pow(e_var, 0.5)
    use_ep = Map.under(Map.mul(Map.sub(e, ep), sign_ep), 0)
    use_e0 = Map.over(Map.mul(Map.sub(e, e0), sign_ep), 0)
    e = Map.add(Map.add(Map.mul(use_ep, ep), Map.mul(use_e0, Map.add(Map.mul(0.9, e0), Map.mul(0.1, ep)))), Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e))
    e_err = Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e_err)
    e_err = Map.add(Map.add(e_err, Map.mul(use_ep, ep_err)), Map.mul(use_e0, Map.pow(Map.add(Map.pow(Map.mul(0.9, e0_err), 2), Map.pow(Map.mul(0.1, ep_err), 2)), 0.5)))
    R = Map.div(Map.sub(1, e), Map.add(1, e))
    de = Map.div(Map.sub(e0, e), e0)
    beta = Map.add(1, Map.div(Map.mul(Map.mul(Map.mul(e0, e0), de), Map.sub(1, de)), Map.sub(1, Map.mul(Map.mul(e0, e0), Map.sub(1, de)))))

    -- diff = 1 if diffraction present, 0 if not
    e_obs = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))
    e_obs_err = Map.mul(2, Map.pow(Map.div(Map.mul(I_A, I_B), Map.pow(Map.add(I_A, I_B), 3)), 0.5))
    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))                    -- Machine learning method
    diff_r = Map.under(Map.div(Map.pow(Map.sub(e_obs, e), 2), Map.add(Map.pow(e_err, 2), Map.pow(e_obs_err, 2))), sigma_cutoff)  -- Fixed bin method
    diff = Map.add(diff_ML, Map.mul(ML, Map.sub(diff_r, Map.mul(diff_ML, diff_r))))  -- If using machine learning, returns ML || bin result
    diff_in_A = Map.mul(diff, Map.over(Map.sub(e_obs, e), 0))
    diff_in_B = Map.mul(diff, Map.under(Map.sub(e_obs, e), 0))

    -- If diffraction is detected, return the corrected abundance for the "clean" detector
    A_B = Map.div(1, X_Bq)
    A_e = Map.div(Map.add(1, e0), Map.mul(Map.add(1, e), Map.sub(1, Map.mul(e0, e))))
    A_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    B_A = Map.div(1, X_Aq)
    B_e = Map.div(Map.sub(e0, 1), Map.mul(Map.sub(1, e), Map.sub(1, Map.mul(e0, e))))
    B_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    X_Adiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Bq), beta), Map.mul(2, R))
    X_Bdiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Aq), beta), 2)
    X_err_Adiff = Map.mul(X_Adiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(A_B, X_Berr), 2), Map.pow(Map.mul(A_e, e_err), 2)), Map.pow(Map.mul(A_e0, e0_err), 2)), 0.5))
    X_err_Bdiff = Map.mul(X_Bdiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(B_A, X_Aerr), 2), Map.pow(Map.mul(B_e, e_err), 2)), Map.pow(Map.mul(B_e0, e0_err), 2)), 0.5))
    X_diff = Map.add(Map.mul(X_Bdiff, diff_in_B), Map.mul(X_Adiff, diff_in_A))
    X_err_diff = Map.add(Map.mul(X_err_Bdiff, diff_in_B), Map.mul(X_err_Adiff, diff_in_A))

    -- Else, return the corrected abundance derived from both detectors
    C_AB = Map.div(1, Map.add(X_Aq, X_Bq))
    C_e = Map.div(Map.sub(Map.mul(e0, Map.sub(1, Map.mul(e, e))), Map.mul(2, e)), Map.mul(Map.sub(1, Map.mul(e, e)), Map.sub(1, Map.mul(e0, e))))
    C_e0 = Map.div(e0, Map.sub(1, Map.mul(e0, e)))
    X_geom = Map.div(Map.mul(Map.add(X_Aq, X_Bq), beta), 2)
    X_err_geom = Map.mul(X_geom, Map.pow(Map.add(Map.add(Map.add(Map.pow(Map.mul(C_AB, X_Aerr), 2), Map.pow(Map.mul(C_AB, X_Berr), 2)), Map.pow(Map.mul(C_e, e_err), 2)), Map.pow(Map.mul(C_e0, e0_err), 2)), 0.5))

    X = Map.add(Map.mul(diff, X_diff), Map.mul(Map.sub(1, diff), X_geom))
    X_err = Map.add(Map.mul(diff, X_err_diff), Map.mul(Map.sub(1, diff), X_err_geom))
    -- ***End estimate calibrated abundance***
    MnO = X
    MnO_err = X_err
    TOTAL = Map.add(TOTAL, MnO)
    TOTAL_err = Map.pow(Map.add(Map.pow(TOTAL_err, 2), Map.pow(MnO_err, 2)), 0.5)

    -- ***Estimate calibrated abundance***
    X_start = Fe_start  -- Insert start energy channel
    X_end = Fe_end    -- Insert end energy channel
    _element = "FeO-T"
    mass = (nFe + nO)
    wt = 1

    I_A = spectrum(X_start, X_end, "A")
    I_B = spectrum(X_start, X_end, "B")
    X_Aq = Map.add(Map.mul(wt, element(_element, "%", "A")), Map.mul((1 - wt), element(_element, "%-as-mmol", "A")))
    X_Bq = Map.add(Map.mul(wt, element(_element, "%", "B")), Map.mul((1 - wt), element(_element, "%-as-mmol", "B")))
    X_Aerr = Map.mul(element(_element, "err", "A"), (wt + (((1 - wt) * 10) / mass)))
    X_Berr = Map.mul(element(_element, "err", "B"), (wt + (((1 - wt) * 10) / mass)))

    midpoint = (0.5 * (X_start + X_end))

    Si_range = Map.under(Map.mul(midpoint, unit), 226)
    SiCa_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (490 - midpoint)), (490 - 226))
    CaSi_range = Map.div(Map.mul(Map.mul(Map.sub(1, Si_range), Map.under(Map.mul(midpoint, unit), 490)), (midpoint - 226)), (490 - 226))
    CaFe_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (854 - midpoint)), (854 - 490))
    FeCa_range = Map.div(Map.mul(Map.mul(Map.mul(Map.sub(1, Si_range), Map.sub(1, Map.over(SiCa_range, 0))), Map.under(Map.mul(midpoint, unit), 854)), (midpoint - 490)), (854 - 490))
    Fe_range = Map.sub(1, Map.under(Map.mul(midpoint, unit), 854))
    e = Map.add(Map.add(Map.mul(e_Si, Map.add(Si_range, SiCa_range)), Map.mul(e_Ca, Map.add(CaSi_range, CaFe_range))), Map.mul(e_Fe, Map.add(FeCa_range, Fe_range)))
    e_var = Map.pow(Map.mul(e_Si_err, Map.add(Si_range, SiCa_range)), 2)
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Ca_err, Map.add(CaSi_range, CaFe_range)), 2))
    e_var = Map.add(e_var, Map.pow(Map.mul(e_Fe_err, Map.add(FeCa_range, Fe_range)), 2))
    e_err = Map.pow(e_var, 0.5)
    use_ep = Map.under(Map.mul(Map.sub(e, ep), sign_ep), 0)
    use_e0 = Map.over(Map.mul(Map.sub(e, e0), sign_ep), 0)
    e = Map.add(Map.add(Map.mul(use_ep, ep), Map.mul(use_e0, Map.add(Map.mul(0.9, e0), Map.mul(0.1, ep)))), Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e))
    e_err = Map.mul(Map.mul(Map.sub(1, use_ep), Map.sub(1, use_e0)), e_err)
    e_err = Map.add(Map.add(e_err, Map.mul(use_ep, ep_err)), Map.mul(use_e0, Map.pow(Map.add(Map.pow(Map.mul(0.9, e0_err), 2), Map.pow(Map.mul(0.1, ep_err), 2)), 0.5)))
    R = Map.div(Map.sub(1, e), Map.add(1, e))
    de = Map.div(Map.sub(e0, e), e0)
    beta = Map.add(1, Map.div(Map.mul(Map.mul(Map.mul(e0, e0), de), Map.sub(1, de)), Map.sub(1, Map.mul(Map.mul(e0, e0), Map.sub(1, de)))))

    -- diff = 1 if diffraction present, 0 if not
    e_obs = Map.div(Map.sub(I_A, I_B), Map.add(I_A, I_B))
    e_obs_err = Map.mul(2, Map.pow(Map.div(Map.mul(I_A, I_B), Map.pow(Map.add(I_A, I_B), 3)), 0.5))
    diff_ML = Map.sub(1, Map.under(diffractionPeaks(X_start, X_end), 1))                    -- Machine learning method
    diff_r = Map.under(Map.div(Map.pow(Map.sub(e_obs, e), 2), Map.add(Map.pow(e_err, 2), Map.pow(e_obs_err, 2))), sigma_cutoff)  -- Fixed bin method
    diff = Map.add(diff_ML, Map.mul(ML, Map.sub(diff_r, Map.mul(diff_ML, diff_r))))  -- If using machine learning, returns ML || bin result
    diff_in_A = Map.mul(diff, Map.over(Map.sub(e_obs, e), 0))
    diff_in_B = Map.mul(diff, Map.under(Map.sub(e_obs, e), 0))

    -- If diffraction is detected, return the corrected abundance for the "clean" detector
    A_B = Map.div(1, X_Bq)
    A_e = Map.div(Map.add(1, e0), Map.mul(Map.add(1, e), Map.sub(1, Map.mul(e0, e))))
    A_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    B_A = Map.div(1, X_Aq)
    B_e = Map.div(Map.sub(e0, 1), Map.mul(Map.sub(1, e), Map.sub(1, Map.mul(e0, e))))
    B_e0 = Map.div(e, Map.sub(1, Map.mul(e0, e)))
    X_Adiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Bq), beta), Map.mul(2, R))
    X_Bdiff = Map.div(Map.mul(Map.mul(Map.add(R, 1), X_Aq), beta), 2)
    X_err_Adiff = Map.mul(X_Adiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(A_B, X_Berr), 2), Map.pow(Map.mul(A_e, e_err), 2)), Map.pow(Map.mul(A_e0, e0_err), 2)), 0.5))
    X_err_Bdiff = Map.mul(X_Bdiff, Map.pow(Map.add(Map.add(Map.pow(Map.mul(B_A, X_Aerr), 2), Map.pow(Map.mul(B_e, e_err), 2)), Map.pow(Map.mul(B_e0, e0_err), 2)), 0.5))
    X_diff = Map.add(Map.mul(X_Bdiff, diff_in_B), Map.mul(X_Adiff, diff_in_A))
    X_err_diff = Map.add(Map.mul(X_err_Bdiff, diff_in_B), Map.mul(X_err_Adiff, diff_in_A))

    -- Else, return the corrected abundance derived from both detectors
    C_AB = Map.div(1, Map.add(X_Aq, X_Bq))
    C_e = Map.div(Map.sub(Map.mul(e0, Map.sub(1, Map.mul(e, e))), Map.mul(2, e)), Map.mul(Map.sub(1, Map.mul(e, e)), Map.sub(1, Map.mul(e0, e))))
    C_e0 = Map.div(e0, Map.sub(1, Map.mul(e0, e)))
    X_geom = Map.div(Map.mul(Map.add(X_Aq, X_Bq), beta), 2)
    X_err_geom = Map.mul(X_geom, Map.pow(Map.add(Map.add(Map.add(Map.pow(Map.mul(C_AB, X_Aerr), 2), Map.pow(Map.mul(C_AB, X_Berr), 2)), Map.pow(Map.mul(C_e, e_err), 2)), Map.pow(Map.mul(C_e0, e0_err), 2)), 0.5))

    X = Map.add(Map.mul(diff, X_diff), Map.mul(Map.sub(1, diff), X_geom))
    X_err = Map.add(Map.mul(diff, X_err_diff), Map.mul(Map.sub(1, diff), X_err_geom))
    -- ***End estimate calibrated abundance***
    FeO = X
    FeO_err = X_err
    TOTAL = Map.add(TOTAL, FeO)
    TOTAL_err = Map.pow(Map.add(Map.pow(TOTAL_err, 2), Map.pow(FeO_err, 2)), 0.5)

    return TOTAL
------------------------ End of Mikes code ------------------------
end

return MikesLib

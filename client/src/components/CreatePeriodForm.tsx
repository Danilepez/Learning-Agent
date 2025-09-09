import { Modal, Form, Select, Space, Button, DatePicker, message } from "antd";
import { useFormik } from "formik";
import * as yup from "yup";
import dayjs, { Dayjs } from "dayjs";
import type { Course } from "../interfaces/courseInterface";
import type { CreateClassDTO } from "../interfaces/claseInterface";

import { ConfigProvider } from "antd";
import esES from "antd/locale/es_ES";
import "dayjs/locale/es";
dayjs.locale("es");

import isBetween from "dayjs/plugin/isBetween";
dayjs.extend(isBetween);

import customParseFormat from "dayjs/plugin/customParseFormat";
dayjs.extend(customParseFormat);

const { Option } = Select;
const MIN_BUSINESS_DAYS = 25;

const periodValidationSchema = yup.object({
  semester: yup
    .string()
    .required("El período es obligatorio")
    .matches(
      /^(PRIMERO|SEGUNDO|INVIERNO|VERANO)\s\d{4}$/,
      "El formato debe ser: PRIMERO 2025, SEGUNDO 2025, INVIERNO 2025 o VERANO 2025"
    ),
  dateBegin: yup.string().required("La fecha de inicio es obligatoria"),
  dateEnd: yup.string().required("La fecha de fin es obligatoria"),
});

interface PeriodFormValues {
  semester: string;
  dateBegin: string;
  dateEnd: string;
}

interface CreatePeriodFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (periodData: CreateClassDTO) => Promise<void>;
  course: Course;
  loading?: boolean;
}

export function CreatePeriodForm({
  open,
  onClose,
  onSubmit,
  course,
  loading = false,
}: CreatePeriodFormProps) {
  const countBusinessDays = (start: Dayjs, end: Dayjs) => {
    let days = 0;
    let current = start.clone();
    while (current.isBefore(end, "day")) {
      const day = current.day();
      if (day !== 0 && day !== 6) days++;
      current = current.add(1, "day");
    }
    return days;
  };

  const formik = useFormik<PeriodFormValues>({
    initialValues: {
      semester: "",
      dateBegin: "",
      dateEnd: "",
    },
    validationSchema: periodValidationSchema,
    onSubmit: async (values, { resetForm }) => {
      try {
        const start = dayjs(values.dateBegin);
        const end = dayjs(values.dateEnd);

        // Validar que haya al menos MIN_BUSINESS_DAYS días hábiles
        const businessDays = countBusinessDays(start, end);
        if (businessDays < MIN_BUSINESS_DAYS) {
          message.error(
            `El período debe tener mínimo ${MIN_BUSINESS_DAYS} días hábiles`
          );
          return;
        }

        const periodData: CreateClassDTO = {
          semester: values.semester,
          teacherId: course.teacherId,
          courseId: course.id,
          dateBegin: values.dateBegin,
          dateEnd: values.dateEnd,
        };

        await onSubmit(periodData);
        resetForm();
        onClose();
      } catch (error) {
        console.error(error);
      }
    },
  });

  const handleCancel = () => {
    onClose();
    formik.resetForm();
  };

  const today = dayjs();
  const currentYear = today.year();

  const allPeriods = [
    {
      name: `PRIMERO ${currentYear}`,
      start: `${currentYear}-01-25`,
      end: `${currentYear}-06-30`,
      type: "NORMAL",
    },
    {
      name: `INVIERNO ${currentYear}`,
      start: `${currentYear}-07-01`,
      end: `${currentYear}-07-24`,
      type: "SPECIAL",
    },
    {
      name: `SEGUNDO ${currentYear}`,
      start: `${currentYear}-07-25`,
      end: `${currentYear}-12-31`,
      type: "NORMAL",
    },
    {
      name: `VERANO ${currentYear}`,
      start: `${currentYear + 1}-01-01`,
      end: `${currentYear + 1}-01-24`,
      type: "SPECIAL",
    },
    {
      name: `PRIMERO ${currentYear + 1}`,
      start: `${currentYear + 1}-01-25`,
      end: `${currentYear + 1}-06-30`,
      type: "NORMAL",
    },
    {
      name: `INVIERNO ${currentYear + 1}`,
      start: `${currentYear + 1}-07-01`,
      end: `${currentYear + 1}-07-24`,
      type: "SPECIAL",
    },
    {
      name: `SEGUNDO ${currentYear + 1}`,
      start: `${currentYear + 1}-07-25`,
      end: `${currentYear + 1}-12-31`,
      type: "NORMAL",
    },
    {
      name: `VERANO ${currentYear + 1}`,
      start: `${currentYear + 2}-01-01`,
      end: `${currentYear + 2}-01-24`,
      type: "SPECIAL",
    },
  ];

  let availableSemesters = allPeriods.filter((p) =>
    dayjs(p.end).isAfter(today)
  );

  availableSemesters = availableSemesters.sort((a, b) =>
    dayjs(a.start).diff(dayjs(b.start))
  );

  availableSemesters = availableSemesters.slice(0, 4);

  const ranges = availableSemesters.reduce((acc, sem) => {
    acc[sem.name] = {
      start: dayjs(sem.start),
      end: dayjs(sem.end),
      type: sem.type,
    };
    return acc;
  }, {} as Record<string, { start: Dayjs; end: Dayjs; type: string }>);

  const disabledDateBegin = (current: Dayjs) => {
    const { semester, dateEnd } = formik.values;
    if (!semester || !ranges[semester]) return true;

    const { start, end } = ranges[semester];
    const minDate = start.isAfter(today) ? start : today;
    let maxDate = end;

    if (dateEnd) {
      let temp = dayjs(dateEnd);
      let days = 0;
      while (days < MIN_BUSINESS_DAYS) {
        temp = temp.subtract(1, "day");
        if (temp.day() !== 0 && temp.day() !== 6) days++;
      }
      maxDate = temp;
    }

    // Bloquear fines de semana
    return (
      current.isBefore(minDate, "day") ||
      current.isAfter(maxDate, "day") ||
      current.day() === 0 ||
      current.day() === 6
    );
  };

  const disabledDateEnd = (current: Dayjs) => {
    const { semester, dateBegin } = formik.values;
    if (!semester || !ranges[semester]) return true;

    const { start, end } = ranges[semester];
    let minDate = start.isAfter(today) ? start : today;
    const maxDate = end;

    if (dateBegin) {
      let temp = dayjs(dateBegin);
      let days = 0;
      while (days < MIN_BUSINESS_DAYS) {
        temp = temp.add(1, "day");
        if (temp.day() !== 0 && temp.day() !== 6) days++;
      }
      minDate = temp;
    }

    // Bloquear fines de semana
    return (
      current.isBefore(minDate, "day") ||
      current.isAfter(maxDate, "day") ||
      current.day() === 0 ||
      current.day() === 6
    );
  };

  const handleDateChange = (
    field: "dateBegin" | "dateEnd",
    value: Dayjs | null
  ) => {
    if (value) {
      const isoDate = value.format("YYYY-MM-DD");
      formik.setFieldValue(field, isoDate);

      if (field === "dateBegin") {
        let temp = value.clone();
        let days = 0;

        // Avanzar MIN_BUSINESS_DAYS días hábiles
        while (days < MIN_BUSINESS_DAYS) {
          temp = temp.add(1, "day");
          const day = temp.day();
          if (day !== 0 && day !== 6) days++;
        }

        // Si la fecha cae fin de semana se mueve al lunes
        if (temp.day() === 6) temp = temp.add(2, "day");
        if (temp.day() === 0) temp = temp.add(1, "day");

        formik.setFieldValue("dateEnd", temp.format("YYYY-MM-DD"));
      }

      const selectedSemester = Object.keys(ranges).find((sem) => {
        const { start, end } = ranges[sem];
        return value.isBetween(start, end, "day", "[]");
      });

      if (selectedSemester && selectedSemester !== formik.values.semester) {
        formik.setFieldValue("semester", selectedSemester);
      }
    } else {
      formik.setFieldValue(field, "");
      if (field === "dateBegin") {
        formik.setFieldValue("dateEnd", "");
      }
    }
  };

  return (
    <ConfigProvider locale={esES}>
      <Modal
        title={`Crear Período - ${course.name}`}
        open={open}
        onCancel={handleCancel}
        footer={null}
        centered
        width={500}
      >
        <Form
          layout="vertical"
          onFinish={formik.handleSubmit}
          style={{ marginTop: "20px" }}
        >
          {/* Selección de período */}
          <Form.Item
            label="Período"
            validateStatus={
              formik.errors.semester && formik.touched.semester ? "error" : ""
            }
            help={formik.touched.semester && formik.errors.semester}
            required
          >
            <Select
              placeholder="Seleccionar período"
              value={formik.values.semester}
              onChange={(value) => {
                formik.setFieldValue("semester", value);
                formik.setFieldValue("dateBegin", "");
                formik.setFieldValue("dateEnd", "");
              }}
              onBlur={() => formik.setFieldTouched("semester", true)}
              style={{ width: "100%" }}
            >
              {availableSemesters.map((sem) => (
                <Option key={sem.name} value={sem.name}>
                  {sem.name}
                </Option>
              ))}
            </Select>
          </Form.Item>

          {/* Fecha inicio */}
          <Form.Item
            label="Inicio de Período"
            validateStatus={
              formik.errors.dateBegin && formik.touched.dateBegin ? "error" : ""
            }
            help={formik.touched.dateBegin && formik.errors.dateBegin}
            required
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD-MM-YYYY"
              placeholder="Seleccionar fecha de inicio"
              value={
                formik.values.dateBegin
                  ? dayjs(formik.values.dateBegin, "YYYY-MM-DD")
                  : undefined
              }
              defaultPickerValue={
                formik.values.semester
                  ? ranges[formik.values.semester].start
                  : undefined
              }
              disabled={!formik.values.semester}
              disabledDate={disabledDateBegin}
              onChange={(value) => handleDateChange("dateBegin", value)}
            />
          </Form.Item>

          {/* Fecha fin */}
          <Form.Item
            label="Fin de Período"
            validateStatus={
              formik.errors.dateEnd && formik.touched.dateEnd ? "error" : ""
            }
            help={formik.touched.dateEnd && formik.errors.dateEnd}
            required
          >
            <DatePicker
              style={{ width: "100%" }}
              format="DD-MM-YYYY"
              placeholder="Seleccionar fecha de fin"
              value={
                formik.values.dateEnd
                  ? dayjs(formik.values.dateEnd, "YYYY-MM-DD")
                  : undefined
              }
              defaultPickerValue={
                formik.values.semester
                  ? ranges[formik.values.semester].start
                  : undefined
              }
              disabled={!formik.values.dateBegin}
              disabledDate={disabledDateEnd}
              onChange={(value) => handleDateChange("dateEnd", value)}
            />
          </Form.Item>

          <Form.Item style={{ marginTop: "24px", marginBottom: 0 }}>
            <Space style={{ width: "100%", justifyContent: "flex-end" }}>
              <Button onClick={handleCancel} disabled={loading}>
                Cancelar
              </Button>
              <Button
                type="primary"
                htmlType="submit"
                loading={loading || formik.isSubmitting}
              >
                Crear Período
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Modal>
    </ConfigProvider>
  );
}
